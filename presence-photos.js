(function () {
  'use strict';

  const size = 192;
  const jpeg = /^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/;
  const maxBytes = 48_000;
  const valid = value => typeof value === 'string' && value.length <= maxBytes && jpeg.test(value);

  function crop(source, zoom, horizontal, vertical) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const scale = size / Math.min(source.naturalWidth, source.naturalHeight) * zoom;
    const width = source.naturalWidth * scale;
    const height = source.naturalHeight * scale;
    const context = canvas.getContext('2d');
    context.fillStyle = '#f0f4f7';
    context.fillRect(0, 0, size, size);
    context.drawImage(source, (size - width) * horizontal, (size - height) * vertical, width, height);
    return canvas;
  }

  function mount({group, house, names, name, icon, storage, render}) {
    const settings = document.createElement('details');
    settings.className = 'presence-settings presence-photos';
    settings.innerHTML = `
      <summary>Fotografias das presenças</summary>
      <div class="presence-photo-options"></div>
      <div class="presence-photo-editor" hidden>
        <label>Carregar fotografia<input type="file" accept="image/*"></label>
        <div class="presence-photo-crop" hidden>
          <div class="presence-photo-window"></div>
          <div class="presence-photo-adjustments">
            <label>Tamanho da fotografia<input type="range" name="zoom" min="1" max="4" step=".01" value="1"></label>
            <label>Posição horizontal<input type="range" name="x" min="0" max="100" value="50"></label>
            <label>Posição vertical<input type="range" name="y" min="0" max="100" value="50"></label>
          </div>
        </div>
        <div class="presence-photo-actions">
          <button type="button" class="primary-action" data-save disabled>Guardar fotografia</button>
          <button type="button" class="secondary-action" data-delete>Remover fotografia</button>
        </div>
      </div>
      <p class="presence-feedback" role="status"></p>`;
    group.append(settings);
    const editor = settings.querySelector('.presence-photo-editor');
    const input = editor.querySelector('[type=file]');
    const preview = editor.querySelector('.presence-photo-crop');
    const photoWindow = preview.querySelector('.presence-photo-window');
    const zoom = editor.querySelector('[name=zoom]');
    const x = editor.querySelector('[name=x]');
    const y = editor.querySelector('[name=y]');
    const save = editor.querySelector('[data-save]');
    const remove = editor.querySelector('[data-delete]');
    const message = settings.querySelector('[role=status]');
    let selected, source, account, request = 0;
    let records = {}, pending = {}, busy = false, nextRead = 0;

    const buttons = names.map((_, slot) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'presence-photo-choice';
      button.innerHTML = '<span class="presence-photo-thumb">' + icon + '<img alt="" hidden></span><span></span>';
      button.addEventListener('click', () => showEditor(slot));
      settings.querySelector('.presence-photo-options').append(button);
      return button;
    });

    const key = (user, suffix) => (user || 'local') + ':photos:' + suffix;
    const current = slot => (Object.hasOwn(pending, slot) ? pending[slot]?.photo : records[slot]?.photo) || null;
    const setImage = (component, photo) => {
      const image = component.querySelector('img');
      if (image.getAttribute('src') !== photo) {
        if (photo) image.src = photo;
        else image.removeAttribute('src');
      }
      image.hidden = !photo;
    };
    function paint() {
      buttons.forEach((button, slot) => {
        setImage(button, current(slot));
        button.lastElementChild.textContent = name(slot);
        button.setAttribute('aria-pressed', String(slot === selected));
      });
      remove.hidden = selected === undefined || !current(selected);
    }

    function draw() {
      if (!source) return;
      photoWindow.replaceChildren(crop(source, +zoom.value, +x.value / 100, +y.value / 100));
    }

    async function loadImage(url, token) {
      const image = new Image();
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = reject;
        image.src = url;
      });
      if (request !== token) return;
      source = image;
      zoom.value = '1';
      x.value = y.value = '50';
      preview.hidden = false;
      save.disabled = false;
      draw();
    }

    function resetEditor() {
      ++request;
      input.value = '';
      source = null;
      preview.hidden = true;
      photoWindow.replaceChildren();
      save.disabled = true;
    }

    function showEditor(slot) {
      selected = slot;
      editor.hidden = false;
      resetEditor();
      message.textContent = '';
      paint();
      const photo = current(slot);
      if (photo) void loadImage(photo, request).catch(() => {});
      input.focus();
    }

    input.addEventListener('change', async () => {
      const file = input.files[0];
      if (!file) return;
      resetEditor();
      const token = request;
      const url = URL.createObjectURL(file);
      message.textContent = 'A abrir fotografia…';
      try {
        await loadImage(url, token);
        if (request === token) message.textContent = '';
      } catch {
        if (request === token) message.textContent = 'Não foi possível abrir a fotografia. Tenta uma imagem JPEG ou PNG.';
      } finally {
        URL.revokeObjectURL(url);
      }
    });

    for (const slider of [zoom, x, y]) slider.addEventListener('input', draw);
    let drag;
    photoWindow.addEventListener('pointerdown', event => {
      if (!source || !event.isPrimary || event.button !== 0) return;
      const bounds = photoWindow.getBoundingClientRect();
      const scale = +zoom.value / Math.min(source.naturalWidth, source.naturalHeight);
      drag = {id: event.pointerId, x: event.clientX, y: event.clientY, left: +x.value, top: +y.value,
        width: bounds.width * (source.naturalWidth * scale - 1),
        height: bounds.height * (source.naturalHeight * scale - 1)};
      photoWindow.setPointerCapture(event.pointerId);
    });
    photoWindow.addEventListener('pointermove', event => {
      if (drag?.id !== event.pointerId) return;
      if (drag.width > 0) x.value = drag.left - (event.clientX - drag.x) / drag.width * 100;
      if (drag.height > 0) y.value = drag.top - (event.clientY - drag.y) / drag.height * 100;
      draw();
    });
    photoWindow.addEventListener('lostpointercapture', () => { drag = null; });

    function change(photo) {
      if (selected === undefined) return;
      const record = {photo, revision: crypto.randomUUID()};
      if (account) {
        pending[selected] = record;
        try { storage.write(key(account.user, 'pending'), pending); }
        catch { message.textContent = 'A guardar a fotografia. Mantém a página aberta até sincronizar.'; }
      } else {
        const next = {...records, [selected]: record};
        try {
          storage.write(key(null, 'saved'), next);
          records = next;
          message.textContent = photo ? 'Fotografia guardada neste dispositivo.' : 'Fotografia removida.';
        } catch {
          message.textContent = 'Não foi possível guardar a alteração neste dispositivo.';
          return;
        }
      }
      render();
      if (account) void sync(true);
    }

    save.addEventListener('click', () => {
      if (!source) return;
      const canvas = crop(source, +zoom.value, +x.value / 100, +y.value / 100);
      let quality = .88;
      let photo = canvas.toDataURL('image/jpeg', quality);
      while (!valid(photo) && quality > .32) {
        quality -= .14;
        photo = canvas.toDataURL('image/jpeg', quality);
      }
      if (valid(photo)) change(photo);
      else message.textContent = 'Não foi possível preparar esta fotografia.';
    });
    remove.addEventListener('click', () => {
      resetEditor();
      change(null);
    });

    function connect(next) {
      if ((next?.user ?? null) === (account?.user ?? null) && next?.client === account?.client) return;
      account = next;
      const user = account?.user;
      records = storage.read(key(user, 'saved')) || {};
      pending = user ? storage.read(key(user, 'pending')) || {} : {};
      selected = undefined;
      editor.hidden = true;
      resetEditor();
      message.textContent = '';
      nextRead = 0;
      paint();
    }

    async function sync(force = false) {
      if (!account || busy) return;
      if (!force && !Object.keys(pending).length && Date.now() < nextRead) return;
      const active = account;
      const table = () => active.client.from('casa_presence_photos');
      const scope = query => query.eq('owner_id', active.user).eq('house', house);
      busy = true;
      try {
        for (const [slot, record] of Object.entries(pending)) {
          const {error} = await table().upsert({owner_id: active.user, house, slot: +slot, ...record},
            {onConflict: 'owner_id,house,slot'});
          if (account !== active) return;
          if (error) throw error;
          records[slot] = record;
          if (pending[slot] === record) delete pending[slot];
          try { storage.write(key(active.user, 'pending'), pending); } catch {}
          message.textContent = record.photo ? 'Fotografia guardada e sincronizada.' : 'Fotografia removida.';
        }
        const {data, error} = await scope(table().select('slot,revision'));
        if (error) throw error;
        if (account !== active) return;
        const changed = data.filter(row => records[row.slot]?.revision !== row.revision).map(row => row.slot);
        if (changed.length) {
          const reply = await scope(table().select('slot,revision,photo')).in('slot', changed);
          if (reply.error) throw reply.error;
          if (account !== active) return;
          for (const row of reply.data) {
            if (row.photo === null || valid(row.photo)) records[row.slot] = {revision: row.revision, photo: row.photo};
          }
        }
        try { storage.write(key(active.user, 'saved'), records); } catch {}
        nextRead = Date.now() + 60_000;
      } catch {
        if (account === active && Object.keys(pending).length) message.textContent = 'Fotografia pendente. A sincronização será repetida automaticamente.';
      } finally {
        busy = false;
        render();
        if (account && account !== active) void sync();
      }
    }

    records = storage.read(key(null, 'saved')) || {};
    paint();
    return {connect, sync, current, paint, setImage};
  }

  window.CasaPresencePhotos = {mount};
})();
