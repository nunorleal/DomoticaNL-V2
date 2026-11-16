begin;

alter table public.casa_plant_positions
  drop constraint if exists casa_plant_positions_setting_check,
  drop constraint if exists casa_plant_positions_check,
  drop constraint if exists casa_plant_positions_item_check,
  add constraint casa_plant_positions_item_check check ((
    jsonb_typeof(position) = 'object'
    and jsonb_typeof(position -> 'x') = 'number'
    and jsonb_typeof(position -> 'y') = 'number'
    and (
      (setting in ('heater', 'dehumidifier', 'christmas-tree')
        and jsonb_typeof(position -> 'room') = 'string'
        and length(position ->> 'room') between 1 and 64
        and (position -> 'x') between '0'::jsonb and '1600'::jsonb
        and (position -> 'y') between '0'::jsonb and '1600'::jsonb
        and position - array['room', 'x', 'y', 'floor'] = '{}'::jsonb
        and (
          (house = 't2' and not (position ? 'floor'))
          or (house = 'duplex' and jsonb_typeof(position -> 'floor') = 'string'
            and (position ->> 'floor') in ('-1', '3', '4'))
        )
      )
      or (house = 't2' and setting in ('garage-fan', 'garage-cellar', 'garage-alarm', 'garage-ev')
        and position - array['x', 'y'] = '{}'::jsonb
        and (position -> 'x') between '0'::jsonb and '100'::jsonb
        and (position -> 'y') between '0'::jsonb and case when setting = 'garage-ev' then '130'::jsonb else '100'::jsonb end
      )
    )
  ) is true);

commit;
