export type AdaptivePhotoLayout =
  | "immersive"
  | "editorial-split"
  | "landscape-stage"
  | "portrait-duo"
  | "landscape-stack"
  | "asymmetric-mosaic"
  | "balanced-grid";

export interface NormalisedPhotoFrame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AdaptiveLayoutDecision {
  kind: AdaptivePhotoLayout;
  frames: NormalisedPhotoFrame[];
  textSurface: "overlay" | "side" | "bottom";
}

function orientation(aspectRatio: number) {
  if (aspectRatio < 0.84) return "portrait";
  if (aspectRatio > 1.28) return "landscape";
  return "balanced";
}

export function chooseAdaptivePhotoLayout(aspectRatios: number[], canvasAspect: number, ordinal = 0): AdaptiveLayoutDecision {
  const ratios = aspectRatios.map((ratio) => Number.isFinite(ratio) && ratio > 0 ? ratio : 1);
  const count = ratios.length;
  if (count <= 1) {
    const ratio = ratios[0] ?? 1;
    const imageOrientation = orientation(ratio);
    const canvasOrientation = orientation(canvasAspect);
    if (imageOrientation === "landscape" && canvasOrientation !== "landscape") {
      return { kind: "landscape-stage", textSurface: "bottom", frames: [{ x: 0, y: 0, width: 1, height: 0.64 }] };
    }
    if (imageOrientation === "portrait" && canvasOrientation === "balanced") {
      const photoOnRight = ordinal % 2 === 0;
      return {
        kind: "editorial-split",
        textSurface: "side",
        frames: [{ x: photoOnRight ? 0.38 : 0, y: 0, width: 0.62, height: 1 }],
      };
    }
    return { kind: "immersive", textSurface: "overlay", frames: [{ x: 0, y: 0, width: 1, height: 1 }] };
  }

  if (count === 2) {
    const first = orientation(ratios[0]!);
    const second = orientation(ratios[1]!);
    if (first === "portrait" && second === "portrait") {
      return {
        kind: "portrait-duo",
        textSurface: "bottom",
        frames: [
          { x: 0, y: 0, width: 0.492, height: 1 },
          { x: 0.508, y: 0, width: 0.492, height: 1 },
        ],
      };
    }
    if (first === "landscape" && second === "landscape") {
      return {
        kind: "landscape-stack",
        textSurface: "bottom",
        frames: [
          { x: 0, y: 0, width: 1, height: 0.492 },
          { x: 0, y: 0.508, width: 1, height: 0.492 },
        ],
      };
    }
    const leadOnRight = ordinal % 2 === 1;
    return {
      kind: "asymmetric-mosaic",
      textSurface: "bottom",
      frames: [
        { x: leadOnRight ? 0.37 : 0, y: 0, width: 0.63, height: 1 },
        { x: leadOnRight ? 0 : 0.646, y: 0.16, width: 0.354, height: 0.68 },
      ],
    };
  }

  if (count === 3) {
    const leadOnRight = ordinal % 2 === 1;
    return {
      kind: "asymmetric-mosaic",
      textSurface: "bottom",
      frames: [
        { x: leadOnRight ? 0.39 : 0, y: 0, width: 0.61, height: 1 },
        { x: leadOnRight ? 0 : 0.626, y: 0, width: 0.374, height: 0.492 },
        { x: leadOnRight ? 0 : 0.626, y: 0.508, width: 0.374, height: 0.492 },
      ],
    };
  }

  const columns = count <= 6 ? 2 : Math.min(4, Math.ceil(Math.sqrt(count * Math.max(canvasAspect, 0.72))));
  const rows = Math.ceil(count / columns);
  const gap = 0.016;
  const cellWidth = (1 - gap * (columns - 1)) / columns;
  const cellHeight = (1 - gap * (rows - 1)) / rows;
  return {
    kind: "balanced-grid",
    textSurface: "bottom",
    frames: ratios.map((_, index) => ({
      x: (index % columns) * (cellWidth + gap),
      y: Math.floor(index / columns) * (cellHeight + gap),
      width: cellWidth,
      height: cellHeight,
    })),
  };
}

export function fitHeadingSize(
  measure: (value: string, size: number) => number,
  value: string,
  maxWidth: number,
  maxLines: number,
  preferred: number,
  minimum: number,
) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  for (let size = preferred; size >= minimum; size -= 2) {
    let lines = 1;
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (!line || measure(candidate, size) <= maxWidth) line = candidate;
      else {
        lines += 1;
        line = word;
      }
    }
    if (lines <= maxLines && (!line || measure(line, size) <= maxWidth)) return size;
  }
  return minimum;
}
