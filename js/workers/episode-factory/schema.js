export const EPISODE_SCHEMA_VERSION = "1.0.0";

export const FACTORY_STATUS = [
  "draft", "validated", "packaged",
  "approved", "published", "archived"
];

export const PLATFORM_NAMES = [
  "micdom", "youtube", "tiktok", "rumble"
];

export function makeEpisodeId() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return "MICDOM-EP-" + date + "-" + crypto.randomUUID().slice(0, 8).toUpperCase();
}

export function makeEpisode(input, now = new Date().toISOString()) {
  const id = makeEpisodeId();

  return {
    schemaVersion: EPISODE_SCHEMA_VERSION,
    episodeId: id,
    organization: "micdom",
    title: clean(input.title, 160),
    idea: clean(input.idea, 3000),
    series: clean(input.series, 120) || "Global Footprints",
    cast: Array.isArray(input.cast)
      ? input.cast.slice(0, 20).map(x => clean(x, 120)).filter(Boolean)
      : ["Nefertiti", "DJ Dehrtay Dog"],
    leadIn: {
      enabled: input.leadInEnabled !== false,
      script: "",
      status: "draft"
    },
    musicVideo: {
      assetId: crypto.randomUUID(),
      filename: clean(input.filename, 255),
      mimeType: "video/mp4",
      durationSeconds: null
    },
    larp: {
      template: "HALLEL",
      title: "",
      persona: "",
      mission: "",
      audiencePrompt: "",
      poll: [],
      disclaimer: "This is a fictional role-play and entertainment experience."
    },
    status: "draft",
    createdAt: now,
    updatedAt: now
  };
}

export function makeRelease(episode) {
  return {
    schemaVersion: EPISODE_SCHEMA_VERSION,
    episodeId: episode.episodeId,
    releaseTitle: episode.title,
    artist: "Micdom AI Records",
    description: "",
    platforms: Object.fromEntries(
      PLATFORM_NAMES.map(name => [name, {
        status: "pending",
        url: null,
        publishedAt: null,
        error: null
      }])
    ),
    ownerApproval: {
      status: "pending",
      approvedAt: null
    },
    distributionStatus: "draft"
  };
}

export function makeMedia(input, episode) {
  return {
    schemaVersion: EPISODE_SCHEMA_VERSION,
    assetId: episode.musicVideo.assetId,
    filename: episode.musicVideo.filename,
    mimeType: "video/mp4",
    sizeBytes: Number(input.sizeBytes) || 0,
    durationSeconds: null,
    width: null,
    height: null,
    sha256: null,
    storage: {
      provider: "pending",
      objectKey: null,
      url: null
    },
    validation: {
      status: "pending",
      checks: []
    }
  };
}

export function validateCreateInput(input) {
  const errors = [];

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return ["Body must be a JSON object."];
  }

  if (!clean(input.idea, 3000)) errors.push("Episode idea is required.");
  if (!clean(input.filename, 255)) errors.push("Video filename is required.");

  const filename = clean(input.filename, 255);
  if (filename && !filename.toLowerCase().endsWith(".mp4")) {
    errors.push("Phase 1 accepts MP4 video metadata only.");
  }

  if (input.sizeBytes !== undefined &&
      (!Number.isFinite(Number(input.sizeBytes)) ||
       Number(input.sizeBytes) < 0)) {
    errors.push("sizeBytes must be a non-negative number.");
  }

  return errors;
}

export function clean(value, maxLength) {
  return typeof value === "string"
    ? value.trim().slice(0, maxLength)
    : "";
}
