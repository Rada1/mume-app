/**
 * @file shaperGuideCatalog.ts
 * @description Raw guide catalog used by the Shaper help panel.
 */

import buildersGuide from '../../../docs/builders_guide.md?raw';
import comHelp from '../../../docs/com_help.md?raw';
import infoZoneHelp from '../../../docs/info_zone_stat_help.md?raw';
import libCommandsRef from '../../../docs/lib_commands_reference.md?raw';
import libHelp from '../../../docs/lib_help.md?raw';
import mudlleIntro from '../../../docs/mudlle_intro.md?raw';
import roomHelp from '../../../docs/room_help.md?raw';
import shaperHelp from '../../../docs/shaper.md?raw';

// --- Types ---

export interface GuideOption {
    id: string;
    title: string;
    content: string;
}

// --- Catalog ---

export const SHAPER_GUIDES: GuideOption[] = [
    { id: 'builders_guide', title: "Ariakas' Building Guide", content: buildersGuide },
    { id: 'mudlle_intro', title: 'An Introduction to MUDLLE', content: mudlleIntro },
    { id: 'room_help', title: 'Room Building Help', content: roomHelp },
    { id: 'com_help', title: '/com Reset Commands Help', content: comHelp },
    { id: 'lib_commands_ref', title: '/lib Command Reference', content: libCommandsRef },
    { id: 'lib_help', title: '/lib Scripts Help', content: libHelp },
    { id: 'info_zone_stat_help', title: '/info & /stat Help', content: infoZoneHelp },
    { id: 'shaper', title: 'Shaper Workspace Spec', content: shaperHelp }
];
