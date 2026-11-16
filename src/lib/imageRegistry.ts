import heroTechCollection from '../assets/images/hero_tech_collection_1794799612163.jpg';
import bannerWorkspaceProductivity from '../assets/images/banner_workspace_productivity_1794799612604.jpg';
import catAudioDevices from '../assets/images/cat_audio_devices_1794799613236.jpg';
import catSmartWatches from '../assets/images/cat_smart_watches_1794799613981.jpg';
import catPowerSolutions from '../assets/images/cat_power_solutions_1794799613842.jpg';
import catDronesCameras from '../assets/images/cat_drones_cameras_1794799614383.jpg';
import prodEarbudsWireless from '../assets/images/prod_earbuds_wireless_1794799614673.jpg';
import prodMechKeyboard from '../assets/images/prod_mech_keyboard_1794799614796.jpg';
import prodPortableSsd from '../assets/images/prod_portable_ssd_1794799615296.jpg';
import prodSmartSpeaker from '../assets/images/prod_smart_speaker_1794799615471.jpg';

const IMAGE_MAP: Record<string, string> = {
  '/src/assets/images/hero_tech_collection_1794799612163.jpg': heroTechCollection,
  '/src/assets/images/banner_workspace_productivity_1794799612604.jpg': bannerWorkspaceProductivity,
  '/src/assets/images/cat_audio_devices_1794799613236.jpg': catAudioDevices,
  '/src/assets/images/cat_smart_watches_1794799613981.jpg': catSmartWatches,
  '/src/assets/images/cat_power_solutions_1794799613842.jpg': catPowerSolutions,
  '/src/assets/images/cat_drones_cameras_1794799614383.jpg': catDronesCameras,
  '/src/assets/images/prod_earbuds_wireless_1794799614673.jpg': prodEarbudsWireless,
  '/src/assets/images/prod_mech_keyboard_1794799614796.jpg': prodMechKeyboard,
  '/src/assets/images/prod_portable_ssd_1794799615296.jpg': prodPortableSsd,
  '/src/assets/images/prod_smart_speaker_1794799615471.jpg': prodSmartSpeaker,
  hero_tech_collection: heroTechCollection,
  banner_workspace_productivity: bannerWorkspaceProductivity,
  cat_audio_devices: catAudioDevices,
  cat_smart_watches: catSmartWatches,
  cat_power_solutions: catPowerSolutions,
  cat_drones_cameras: catDronesCameras,
  prod_earbuds_wireless: prodEarbudsWireless,
  prod_mech_keyboard: prodMechKeyboard,
  prod_portable_ssd: prodPortableSsd,
  prod_smart_speaker: prodSmartSpeaker,
};

export function resolveImageUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  if (IMAGE_MAP[src]) return IMAGE_MAP[src];
  return src;
}

export const HERO_IMAGE = heroTechCollection;
export const WORKSPACE_BANNER_IMAGE = bannerWorkspaceProductivity;
export const PRESET_GALLERY_OPTIONS = [
  { label: 'Headphones Studio', value: '/src/assets/images/cat_audio_devices_1794799613236.jpg' },
  { label: 'Titanium Smartwatch', value: '/src/assets/images/cat_smart_watches_1794799613981.jpg' },
  { label: 'GaN Power Station', value: '/src/assets/images/cat_power_solutions_1794799613842.jpg' },
  { label: '4K Gimbal Drone', value: '/src/assets/images/cat_drones_cameras_1794799614383.jpg' },
  { label: 'Wireless Earbuds', value: '/src/assets/images/prod_earbuds_wireless_1794799614673.jpg' },
  { label: 'CNC Mechanical Keyboard', value: '/src/assets/images/prod_mech_keyboard_1794799614796.jpg' },
  { label: 'Portable NVMe SSD', value: '/src/assets/images/prod_portable_ssd_1794799615296.jpg' },
  { label: 'Acoustic Smart Speaker', value: '/src/assets/images/prod_smart_speaker_1794799615471.jpg' },
];
