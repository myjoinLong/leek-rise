import type { NpcId } from '../../../core/types';

interface Pose {
  lift: number;
  tilt: number;
}

interface IdlePerformance {
  poses: readonly Pose[];
  duration: number;
}

const performances: Record<NpcId, IdlePerformance> = {
  jiuge: { poses: [{ lift: 0, tilt: 0 }, { lift: 1, tilt: -0.8 }, { lift: 0, tilt: 0 }], duration: 7 },
  longge: { poses: [{ lift: 0, tilt: -1 }, { lift: 0, tilt: 1.2 }, { lift: 0, tilt: -1 }], duration: 5 },
  chen: { poses: [{ lift: 0, tilt: 0.4 }, { lift: 0, tilt: -0.4 }, { lift: 0, tilt: 0.4 }], duration: 8 },
  bodhisattva: { poses: [{ lift: 0, tilt: 0 }, { lift: 1.5, tilt: 0 }, { lift: 0, tilt: 0 }], duration: 9 },
  xiaolian: { poses: [{ lift: 0, tilt: -1 }, { lift: 1.5, tilt: 1 }, { lift: 0, tilt: -1 }], duration: 5 },
  sujie: { poses: [{ lift: 0, tilt: 0 }, { lift: 1, tilt: 0 }, { lift: 0, tilt: 0 }], duration: 8 },
  zhou: { poses: [{ lift: 0, tilt: 0 }, { lift: 0, tilt: -0.7 }, { lift: 0, tilt: 0 }], duration: 7 },
  wang: { poses: [{ lift: 0, tilt: 0.3 }, { lift: 1, tilt: -0.5 }, { lift: 0, tilt: 0.3 }], duration: 6 },
  laoliang: { poses: [{ lift: 0, tilt: -0.6 }, { lift: 0, tilt: 0.6 }, { lift: 0, tilt: -0.6 }], duration: 8 },
  sweeper: { poses: [{ lift: 0, tilt: 0 }, { lift: 0, tilt: -0.5 }, { lift: 0, tilt: 0.5 }, { lift: 0, tilt: 0 }], duration: 11 },
  delivery: { poses: [{ lift: 0, tilt: 0 }, { lift: 1.5, tilt: 0.5 }, { lift: 0, tilt: 0 }], duration: 5 },
  zheng: { poses: [{ lift: 0, tilt: 0 }, { lift: 1, tilt: 0.7 }, { lift: 0, tilt: 0 }], duration: 7 },
  phoneflip: { poses: [{ lift: 0, tilt: -0.7 }, { lift: 0, tilt: 0.8 }, { lift: 0, tilt: -0.7 }], duration: 6 },
};

export function playNpcIdlePerformance(
  person: HTMLElement,
  npcId: NpcId,
  depthScale: string,
  baseDuration: number,
  index: number,
): Animation {
  const performance = performances[npcId];
  const keyframes = performance.poses.map(({ lift, tilt }) => ({
    transform: `scale(${depthScale}) translateY(-${lift}px) rotate(${tilt}deg)`,
  }));
  const duration = baseDuration * performance.duration;
  return person.animate(keyframes, {
    duration,
    delay: -((index * 137) % duration),
    iterations: Infinity,
    easing: 'steps(2, end)',
  });
}
