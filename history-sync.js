(function () {
  'use strict';

  const house = document.currentScript.dataset.house;
  const fromFile = window.location?.protocol === 'file:';
  const projectUrl = 'https://xnxkezilascdouyueukm.supabase.co';
  const publishableKey = 'sb_publishable_AUt0AI1NArlh2NJsuUrweQ_TkhOjaf1';
  const daily = window.CasaDailyEnergy;
  const storageKey = 'casa-history-sync-' + house;
  const cadence = 120000;
  let client, session, busy = false;
  let downloaded = 0, sent = 0;
  let syncAgain = false;
  let manualSyncQueued = false;
  let pendingRelease;
  let status = 'Inicia sessão para consultar o histórico partilhado.';

  const settings = document.getElementById('energy-settings-actions');
  const access = document.createElement('button');
  access.type = 'button';
  access.className = 'secondary-action';
  access.textContent = 'Sincronizar histórico';
  settings.append(access);

  const indicator = document.createElement('button');
  indicator.type = 'button';
  indicator.hidden = true;
  indicator.className = 'history-sync-indicator';
  indicator.innerHTML = `<span class="cloud-rail-track" aria-hidden="true"><i></i></span>
    <small class="cloud-rail-heading"></small>
    <svg class="history-sync-check" viewBox="0 0 16 16" aria-hidden="true"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="m3 8 3 3 7-7"/>
    </svg>
    <svg class="history-sync-disconnected" viewBox="0 0 16 16" aria-hidden="true"
      fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
      <path d="M2 2l12 12M1 6a11 11 0 0 1 2-1.4M7 3.4A11 11 0 0 1 15 6M3.5 8.5a7 7 0 0 1 2.4-1.3M9.4 7.1a7 7 0 0 1 3.1 1.4M6 11a3 3 0 0 1 2.4-.6M8 13.3h.01"/>
    </svg>`;
  const shellyCounter = document.getElementById('shelly-activity');
  shellyCounter?.after(indicator);
  const roleLabel = indicator.querySelector('small');

  const dialog = document.createElement('dialog');
  dialog.className = 'energy-tariff-dialog popup';
  dialog.setAttribute('aria-labelledby', 'history-sync-title');
  dialog.innerHTML = `
    <button type="button" class="energy-tariff-close" aria-label="Fechar">×</button>
    <h2 id="history-sync-title">Sincronizar histórico</h2>
    <form>
      ${fromFile ? '<p class="energy-hint">Neste ficheiro local, a sessão dura enquanto a página estiver aberta. Para guardar a sessão, abre a app por HTTPS ou localhost.</p>' : ''}
      <label>Email <input type="email" autocomplete="username" required></label>
      <label>Palavra-passe <input type="password" autocomplete="current-password" required></label>
      <button class="primary-action">Iniciar sessão</button>
    </form>
    <div data-signed-in hidden>
      <div class="history-sync-warning" hidden>
        <div role="alert">
          <strong>Já existe um emissor nesta casa</strong>
          <p>O Supabase recusou o envio deste dispositivo. Desativa a recolha no outro dispositivo ou tenta novamente após 6 minutos sem contacto do emissor.</p>
        </div>
        <button type="button" data-dismiss-writer-warning class="secondary-action">Dispensar aviso</button>
      </div>
      <label class="energy-check"><input type="checkbox"> Usar este dispositivo para recolher e enviar o histórico</label>
      <p class="energy-hint">Ativa esta opção apenas no dispositivo que guarda o histórico desta casa. Ao ativar, envias os registos de consumo para o Supabase.</p>
      <button type="button" data-refresh class="secondary-action">Sincronizar agora</button>
      <button type="button" data-sign-out class="secondary-action">Terminar sessão</button>
    </div>
    <p data-writer-status aria-live="polite" hidden></p>
    <p role="status"></p>
    <p data-continuity class="energy-hint" aria-live="polite" hidden></p>`;
  document.body.append(dialog);
  const form = dialog.querySelector('form');
  const email = form.querySelector('[type=email]');
  const password = form.querySelector('[type=password]');
  const writerBox = dialog.querySelector('[type=checkbox]');
  const userControls = dialog.querySelector('[data-signed-in]');
  const feedback = dialog.querySelector('[role=status]');
  const writerStatus = dialog.querySelector('[data-writer-status]');
  const continuity = dialog.querySelector('[data-continuity]');
  const noWriter = 'Nenhum dispositivo está a enviar o histórico.';
  const writerWarning = dialog.querySelector('.history-sync-warning');
  const writerStorage = () => storageKey + '-writer-' + session.user.id;
  function writerSettings() {
    if (!session) return null;
    try { return JSON.parse(localStorage.getItem(writerStorage())); }
    catch { return null; }
  }

  let noWriterConfirmed = false;
  let connectionLost = false;

  function paint(message = status) {
    status = message;
    form.hidden = Boolean(session);
    userControls.hidden = !session;
    continuity.hidden = !session;
    const writer = writerSettings();
    writerBox.checked = writer?.enabled === true;
    writerWarning.hidden = writer?.conflict !== true || noWriterConfirmed;
    const showNoWriter = Boolean(session) && !writerBox.checked && noWriterConfirmed;
    writerStatus.hidden = !showNoWriter;
    writerStatus.textContent = showNoWriter ? noWriter : '';
    feedback.textContent = status;
    indicator.hidden = !session;
    document.body.classList.toggle('history-sync-active', Boolean(session));
    if (session) {
      const role = writerBox.checked ? 'Emissor' : 'Recetor';
      indicator.dataset.role = role;
      const disconnected = connectionLost || !navigator.onLine;
      indicator.dataset.disconnected = String(disconnected);
      roleLabel.textContent = role;
      const action = writerBox.checked ? 'Enviar histórico para o Supabase' : 'Atualizar histórico do Supabase';
      const confirmation = !disconnected && indicator.dataset.syncOk === 'true' ? 'Sincronizado com sucesso' : '';
      indicator.setAttribute('aria-label', [role, disconnected ? 'Sem ligação' : '', showNoWriter ? noWriter : '', confirmation, action].filter(Boolean).join(' · '));
      indicator.title = [action, confirmation, showNoWriter ? noWriter : '', status].filter(Boolean).join(' · ');
    }
  }

  function connect() {
    if (client) return client;
    if (!window.supabase) {
      paint('Não foi possível carregar a ligação ao Supabase.');
      return null;
    }
    client = window.supabase.createClient(projectUrl, publishableKey, {
      auth: {storageKey, detectSessionInUrl:false, persistSession:!fromFile},
    });
    client.auth.onAuthStateChange((_event, nextSession) => {
      const changedUser = session?.user.id !== nextSession?.user.id;
      session = nextSession;
      // Keep app rendering out of the SDK's sign-in callback.
      setTimeout(() => {
        if (changedUser) {
          downloaded = 0;
          sent = 0;
          pendingRelease = null;
          continuity.textContent = '';
          clearSyncConfirmation();
          noWriterConfirmed = false;
          connectionLost = false;
          daily.setSharedHistory(null);
          status = session ? 'A ligar ao histórico…' : 'Sessão terminada.';
        }
        paint();
        if (session) sync();
      }, 0);
    });
    return client;
  }

  function clearSyncConfirmation() {
    delete indicator.dataset.syncOk;
  }

  function syncResult({data, error, status}) {
    connectionLost = Boolean(error) && (status === 0 || status === 502 || status === 503 || status === 504);
    if (error) throw error;
    return data;
  }

  async function showContinuity(owner) {
    const {data, error} = await client.from('casa_energy_history')
      .select('continuous_since,updated_at').eq('house', house).maybeSingle();
    if (session?.user.id !== owner || !dialog.open || !navigator.onLine) return;
    if (error) {
      continuity.textContent = 'Não foi possível consultar a sequência de gravações.';
    } else if (!data) {
      continuity.textContent = 'Ainda não há dados guardados no Supabase.';
    } else if (!data.continuous_since) {
      continuity.textContent = 'A sequência de gravações começa no próximo envio de dados novos.';
    } else {
      const format = value => new Date(value).toLocaleString('pt-PT', {timeZone:'Europe/Lisbon'});
      continuity.textContent = 'Última sequência de gravações: ' + format(data.continuous_since)
        + ' a ' + format(data.updated_at) + '.';
    }
  }

  async function sync(manual = false) {
    manual = manual === true;
    if (!session) return;
    if (!navigator.onLine) {
      clearSyncConfirmation();
      noWriterConfirmed = false;
      continuity.textContent = 'Sem ligação para consultar a sequência de gravações.';
      paint('Sem ligação à Internet. O histórico local continua disponível.');
      return;
    }
    if (busy) {
      syncAgain = true;
      manualSyncQueued ||= manual;
      return;
    }
    busy = true;
    indicator.setAttribute('aria-busy', 'true');
    const owner = session.user.id;
    const stillSignedIn = () => session?.user.id === owner;
    try {
      if (pendingRelease) {
        const release = pendingRelease;
        const response = await client.rpc('casa_release_energy_writer', {p_house:house, p_writer:release});
        if (!stillSignedIn()) return;
        syncResult(response);
        if (pendingRelease === release) pendingRelease = null;
      }
      const writer = writerSettings();
      if (writer?.enabled) {
        const snapshot = daily.snapshot();
        const readingAt = Math.max(0, ...Object.values(snapshot.entries).map(entry => entry.last[0]));
        if (!readingAt) {
          clearSyncConfirmation();
          paint('À espera dos primeiros dados de consumo neste dispositivo.');
          return;
        }
        const heartbeat = readingAt === sent;
        const response = await client.rpc('casa_publish_energy_history', {
          p_house:house, p_writer:writer.key, p_reading_at:heartbeat ? null : readingAt,
          p_snapshot:heartbeat ? null : snapshot,
        });
        if (!stillSignedIn()) return;
        const data = syncResult(response);
        if (!writerSettings()?.enabled) return;
        if (data === 'other_writer') {
          clearSyncConfirmation();
          localStorage.setItem(writerStorage(), JSON.stringify({...writer, enabled:false, conflict:true}));
          paint('Modo de consulta ativo.');
          syncAgain = true;
          return;
        }
        if (writerSettings()?.conflict === true) dismissWriterWarning();
        sent = readingAt;
        if (data === 'saved' || data === 'unchanged') indicator.dataset.syncOk = 'true';
        paint('Histórico disponível para consulta nos outros dispositivos.');
        return;
      }

      const response = await client.from('casa_energy_history')
        .select('reading_at,updated_at,writer_expires_at').eq('house', house).maybeSingle();
      if (!stillSignedIn()) return;
      const row = syncResult(response);
      if (writerSettings()?.enabled) return;
      noWriterConfirmed = !row?.writer_expires_at || Date.parse(row.writer_expires_at) <= Date.now();
      if (!row) {
        clearSyncConfirmation();
        daily.setSharedHistory(null);
        downloaded = 0;
        paint('À espera do primeiro envio do dispositivo de recolha.');
        return;
      }
      if (row.reading_at !== downloaded) {
        const response = await client.from('casa_energy_history')
          .select('reading_at,snapshot').eq('house', house).single();
        if (!stillSignedIn()) return;
        const record = syncResult(response);
        if (writerSettings()?.enabled) return;
        daily.setSharedHistory(record.snapshot);
        downloaded = record.reading_at;
      }
      if (manual || !writer?.conflict) indicator.dataset.syncOk = 'true';
      paint('Histórico partilhado atualizado em ' + new Date(row.updated_at).toLocaleString('pt-PT', {timeZone:'Europe/Lisbon'}) + '.');
    } catch {
      if (stillSignedIn()) {
        clearSyncConfirmation();
        noWriterConfirmed = false;
        paint('Não foi possível sincronizar. O histórico local continua disponível.');
      }
    } finally {
      if (dialog.open && stillSignedIn()) {
        try {
          await showContinuity(owner);
        } catch {
          if (dialog.open && stillSignedIn() && navigator.onLine) {
            continuity.textContent = 'Não foi possível consultar a sequência de gravações.';
          }
        }
      }
      busy = false;
      indicator.removeAttribute('aria-busy');
      if (syncAgain) {
        syncAgain = false;
        const queuedManual = manualSyncQueued;
        manualSyncQueued = false;
        setTimeout(() => sync(queuedManual), 0);
      }
    }
  }

  function openSyncDialog() {
    continuity.textContent = 'A consultar a sequência de gravações…';
    dialog.showModal();
    if (connect()) sync();
  }
  access.addEventListener('click', openSyncDialog);
  indicator.addEventListener('click', () => sync(true));
  dialog.querySelector('.energy-tariff-close').addEventListener('click', () => dialog.close());
  function signInError(error) {
    if (!navigator.onLine) return 'Sem ligação à Internet. Tenta novamente quando estiveres online.';
    if (error?.code === 'email_not_confirmed') return 'O email deste utilizador ainda não foi confirmado no Supabase.';
    if (error?.code === 'invalid_credentials') return 'Email ou palavra-passe incorretos. Usa a conta criada em Authentication → Users.';
    if (error?.status === 429) return 'Demasiadas tentativas. Aguarda um pouco e volta a tentar.';
    if (fromFile) return 'O navegador não conseguiu iniciar sessão a partir deste ficheiro. Abre a app por HTTPS ou localhost e tenta de novo.';
    if (error?.name === 'AuthRetryableFetchError' || error?.name === 'TypeError') {
      return 'Não foi possível contactar o Supabase. Verifica a ligação e tenta de novo.';
    }
    return 'Não foi possível concluir o início de sessão. Reabre a app e tenta de novo.';
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      if (!connect()) return;
      const {error} = await client.auth.signInWithPassword({email:email.value.trim(), password:password.value});
      if (error) paint(signInError(error));
    } catch (error) {
      paint(signInError(error));
    } finally {
      password.value = '';
      button.disabled = false;
    }
  });
  writerBox.addEventListener('change', () => {
    if (!session) return;
    try {
      const current = writerSettings();
      const key = current?.key ?? crypto.randomUUID();
      localStorage.setItem(writerStorage(), JSON.stringify({...current, key, enabled:writerBox.checked, conflict:false}));
      noWriterConfirmed = false;
      if (!writerBox.checked && current?.enabled) pendingRelease = key;
      clearSyncConfirmation();
      paint();
      if (writerBox.checked) {
        daily.setSharedHistory(null);
        downloaded = 0;
        sent = 0;
      }
      sync();
    } catch {
      paint('Não foi possível guardar a opção neste navegador.');
    }
  });
  function dismissWriterWarning() {
    const current = writerSettings();
    if (!current?.conflict) return;
    try {
      localStorage.setItem(writerStorage(), JSON.stringify({...current, conflict:false}));
      paint();
    } catch {
      paint('Não foi possível dispensar o aviso neste navegador.');
    }
  }

  dialog.querySelector('[data-dismiss-writer-warning]').addEventListener('click', dismissWriterWarning);
  dialog.querySelector('[data-refresh]').addEventListener('click', () => sync(true));
  dialog.querySelector('[data-sign-out]').addEventListener('click', async () => {
    const {error} = await client.auth.signOut({scope:'local'});
    if (error) paint('Não foi possível terminar a sessão.');
  });
  window.addEventListener('online', sync);
  window.addEventListener('offline', sync);
  window.addEventListener('pageshow', sync);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) sync(); });
  window.setInterval(() => { if (!document.hidden) sync(); }, cadence);
  try { if (!fromFile && localStorage.getItem(storageKey)) connect(); }
  catch { paint('O armazenamento da sessão está indisponível neste navegador.'); }
})();
