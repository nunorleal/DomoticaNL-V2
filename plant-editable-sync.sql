begin;

alter table public.casa_plant_preferences
  drop constraint if exists casa_plant_preferences_setting_check,
  drop constraint if exists casa_plant_preferences_check,
  drop constraint if exists casa_plant_preferences_value_check,
  drop constraint if exists casa_plant_preferences_editable_check,
  add constraint casa_plant_preferences_editable_check check ((
    octet_length(value::text) <= 262144
    and (
      (setting = 'shelly-disabled' and jsonb_typeof(value) = 'array')
      or (setting = 'shelly-config' and jsonb_typeof(value) = 'object' and not (value ?| array['authKey','rememberKey']))
      or (setting = 'environment-mode' and value in ('"auto"', '"day"', '"night"'))
      or (setting = 'screensaver-delay' and value in ('0','15','30','60','120','300','600','900','1800'))
      or (setting = 'banner-scale' and value in ('60','65','70','75','80','85','90','95','100','105','110','115','120','125','130','135','140','145','150','155','160'))
      or (setting in ('weather-city', 'meteo-settings') and jsonb_typeof(value) = 'object')
      or (setting ~ '^room-name:[a-z0-9:-]{1,55}$' and jsonb_typeof(value) = 'string')
      or (setting = 'energy-tariff' and jsonb_typeof(value) = 'object' and not (value ? 'globalTotals'))
      or (setting in ('timer-preset:heater-dialog','timer-preset:dehumidifier-dialog') and jsonb_typeof(value) = 'array')
      or (house = 't2' and setting in ('media-labels','office-labels') and jsonb_typeof(value) = 'boolean')
      or ((
          (house = 't2' and setting ~ '^banner-position:room:[a-z0-9-]{1,40}$')
          or (house = 'duplex' and setting ~ '^banner-position:(room|sensor|alarm|fan|ev):(-1|3|4):[a-z0-9-]{1,40}$')
        )
        and jsonb_typeof(value) = 'object'
        and jsonb_typeof(value->'x') = 'number' and jsonb_typeof(value->'y') = 'number'
        and value - array['x','y'] = '{}'::jsonb
        and (value->'x') between '0'::jsonb and case when house='t2' then '100'::jsonb else '1600'::jsonb end
        and (value->'y') between '0'::jsonb and case when house='t2' then '100'::jsonb else '1600'::jsonb end)
    )
  ) is true);

commit;
