import edit from './phase2-icon-edit.svg';
import deleteIcon from './phase2-icon-delete.svg';
import options from './phase2-icon-options.svg';
import sproutNeglected from './phase2-sprout-neglected.png';
import sproutWithered from './phase2-sprout-withered.png';
import cactusNeglected from './phase2-cactus-neglected.png';
import cactusWithered from './phase2-cactus-withered.png';
import approvalPlant from './phase2-detection-approval-plant.png';
import approvalCheck from './phase2-detection-approval-check.svg';
import messageTail from './phase2-detection-message-tail.svg';
import photo from './phase2-camera-photo.png';
import focus from './phase2-camera-focus.svg';
import shutter from './phase2-camera-shutter.svg';
import promptTail from './phase2-camera-prompt-tail.svg';
import gardenSupport from './phase2-garden-support.svg';
import preferencesCalm from './phase2-preferences-calm.svg';
import preferencesSchedule from './phase2-preferences-schedule.svg';
import preferencesLimit from './phase2-preferences-limit.svg';

export const phase2Assets = {
  edit,
  delete: deleteIcon,
  options,
  sprout: { neglected: sproutNeglected, withered: sproutWithered },
  cactus: { neglected: cactusNeglected, withered: cactusWithered },
  approvalPlant,
  approvalCheck,
  messageTail,
  photo,
  focus,
  shutter,
  promptTail,
  gardenSupport,
  preferencesCalm,
  preferencesSchedule,
  preferencesLimit,
} as const;
