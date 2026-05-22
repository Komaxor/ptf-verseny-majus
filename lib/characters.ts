// Single source of truth for the three round characters.
// Editing this file changes names, roles, images, and scene descriptions
// everywhere they're displayed (chat avatars, round header, scene visual,
// asset preloader). Future monthly forks only edit this file.

export interface Character {
  name: string;
  role: string;
  sceneDescription: string;
  avatar: string;
  crop: string;
}

export type RoundKey = 1 | 2 | 3;

export const CHARACTERS: Record<RoundKey, Character> = {
  1: {
    name: "Igor",
    role: "Csernobili erőmű sorompós portás",
    sceneDescription: "Igor, a csernobili erőmű sorompójánál szolgálatot teljesítő portás",
    avatar: "/images/first-character.png",
    crop: "/images/first-character-crop.png",
  },
  2: {
    name: "Sergey",
    role: "Karbantartó technikus",
    sceneDescription: "Sergey, a csernobili erőmű karbantartó technikusa egy cigarettaszünet közben az épület mögött",
    avatar: "/images/second-character.png",
    crop: "/images/second-character-crop.png",
  },
  3: {
    name: "Tatyana",
    role: "Laborasszisztens",
    sceneDescription: "Tatyana, a csernobili erőmű laborasszisztense a vezérlőteremben",
    avatar: "/images/third-character.png",
    crop: "/images/third-character-crop.png",
  },
};
