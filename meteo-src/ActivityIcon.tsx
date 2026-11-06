import { Flame, Heater, Droplets, WashingMachine, Utensils, Tv, Car, Gamepad2, Speaker, Router, Monitor, Server, HardDrive, Plug } from "lucide-react";
const icons: Record<string,typeof Flame>={heater:Heater,dehumidifier:Droplets,washer:WashingMachine,dishwasher:Utensils,tv:Tv,ev:Car,playstation:Gamepad2,soundbar:Speaker,vodafone:Router,unifi:Router,monitor:Monitor,apollo:Speaker,terramaster:Server,blackdrive:HardDrive,boiler:Flame};
export function ActivityIcon({id}:{id:string}){const Icon=icons[id]||Plug;return <Icon aria-hidden="true"/>;}
