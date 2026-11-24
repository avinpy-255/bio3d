/**
 * index.js — Registry of procedural 3D topic builders and part color palettes.
 * (animal-cell and human-heart use standalone GLBs generated via tools/.)
 */

import { buildPlantCell, PLANT_CELL_COLORS } from './plant-cell.js';
import { buildBacteria, BACTERIA_COLORS } from './bacteria.js';
import { buildLeaf, LEAF_COLORS } from './leaf.js';
import { buildFlower, FLOWER_COLORS } from './flower.js';
import { buildFish, FISH_COLORS } from './fish.js';

export const BUILDERS = {
  'plant-cell': buildPlantCell,
  'bacteria':   buildBacteria,
  'leaf':       buildLeaf,
  'flower':     buildFlower,
  'fish':       buildFish,
};

export const TOPIC_PART_COLORS = {
  'animal-cell': {
    'cell-membrane':         0xfab89e,
    'nucleus':               0x8557d1,
    'nuclear-envelope':      0x9985e6,
    'nucleolus':             0x381a6b,
    'endoplasmic-reticulum': 0x57a8c7,
    'er-rough':              0x57a8c7,
    'er-smooth':             0x80d194,
    'ribosomes':             0x383894,
    'golgi-apparatus':       0xf5cc3d,
    'mitochondria':          0xff9e38,
    'lysosomes':             0x85d14d,
    'centrosome':            0xeb6199,
    'centrioles':            0xeb6199,
  },
  'human-heart': {
    'left-ventricle':     0xcc2b30,
    'right-ventricle':    0xcc2b30,
    'right-atrium':       0xe05c57,
    'left-atrium':        0xe05c57,
    'aorta':              0xdb3833,
    'pulmonary-artery':   0x5c75d6,
    'vena-cava':          0x4d61c7,
    'superior-vena-cava': 0x4d61c7,
    'inferior-vena-cava': 0x4d61c7,
    'pulmonary-veins':    0xe04d47,
    'coronary-arteries':  0xeb8c26,
  },
  'plant-cell': PLANT_CELL_COLORS,
  'bacteria':   BACTERIA_COLORS,
  'leaf':       LEAF_COLORS,
  'flower':     FLOWER_COLORS,
  'fish':       FISH_COLORS,
};
