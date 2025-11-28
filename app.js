const promptInput = document.getElementById("prompt-input");
const contextInput = document.getElementById("context-input");
const sourcesInput = document.getElementById("sources-input");

const modeSelect = document.getElementById("mode-select");
const toggleTruncate = document.getElementById("toggle-truncate");
const toggleNoise = document.getElementById("toggle-noise");
const toggleLength = document.getElementById("toggle-length");
const toggleConstraints = document.getElementById("toggle-constraints");

const presetButtons = document.querySelectorAll(".btn-preset");
const generateBtn = document.getElementById("generate-btn");

const statusEl = document.getElementById("status");
const summaryEl = document.getElementById("summary");

const baselineTextEl = document.getElementById("baseline-text");
const stressedTextEl = document.getElementById("stressed-text");
const baselineMetaEl = document.getElementById("baseline-meta");
const stressedMetaEl = document.getElementById("stressed-meta");
const modePillEl = document.getElementById("mode-pill");
const watchTextEl = document.getElementById("watch-text");

// Preset scenarios
const PRESETS = {
  policy: {
    prompt:
      "Explain our data retention and deletion policy to a non-technical customer in under 200 words.",
    context:
      "The product stores user activity logs for 30 days, billing records for 7 years, and application logs for 14 days. Legal has approved user-initiated data deletion for account data, not financial records.",
    sources:
      "Policy snippet: 'Users may request deletion of their account profile data at any time. We retain billing and tax records as required by law.'"
  },
  support: {
    prompt:
      "Write a support reply to a customer whose dashboard shows different numbers than their CSV export.",
    context:
      "The dashboard is near-real-time with caching; CSV exports are generated nightly. Timezones sometimes differ between UI and export.",
    sources:
      "Knowledge base: 'Dashboard data is updated every 5 minutes, while CSV exports reflect data from the last nightly batch.'"
  },
  analysis: {
    prompt:
      "Compare the strengths and weaknesses of using retrieval-augmented generation vs direct prompting for internal policy questions.",
    context:
      "The company has a large, messy policy repository across multiple tools. Some policies are out of date; others live only in email threads.",
    sources:
      "Design doc: 'RAG helps ground answers in specific documents but increases dependency on retrieval quality and document hygiene.'"
  }
};

function setStatus(text) {
  statusEl.textContent = text || "";
}

// Summary badges
function summaryIdle(text) {
  summaryEl.innerHTML = `
    <div class="summary-badge summary-badge-idle">
      ${text}
    </div>
  `;
}

function summaryOk(text) {
  summaryEl.innerHTML = `
    <div class="summary-badge summary-badge-ok">
      ${text}
    </div>
  `;
}

function summaryWarn(text) {
  summaryEl.innerHTML = `
    <div class="summary-badge summary-badge-warn">
      ${text}
    </div>
  `;
}

// Basic helpers
function trimOrFallback(text, fallback) {
  const t = (text || "").trim();
  return t || fallback;
}

function shortened(text, maxLen) {
  const t = (text || "").trim();
  if (!t) return "";
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 1).trimEnd() + "…";
}

// Baseline response generator
function buildBaselineResponse(prompt, context, sources, knobs) {
  const promptShort = shortened(prompt, 140) || "Explain the requested topic clearly and accurately.";
  const hasContext = !!context.trim();
  const hasSources = !!sources.trim();

  const parts = [];

  parts.push(`(Baseline — grounded, cooperative)\n`);
  parts.push(`1. What this response tries to do`);
  parts.push(
    `- Directly answer: "${promptShort}"` +
      (hasContext ? " using the background context provided." : ".")
  );
  if (hasSources) {
    parts.push(`- Stay tightly aligned with the provided sources/snippets.`);
  } else {
    parts.push(`- Answer from general knowledge, since no explicit sources were provided.`);
  }
  parts.push(`- Preserve clarity, structure, and any explicit constraints in the prompt.`);

  parts.push(`\n2. How it uses context & sources`);
  if (hasContext) {
    parts.push(`- Background context is treated as internal notes, not user-visible text.`);
  } else {
    parts.push(`- No background context: response relies on the prompt and any sources only.`);
  }
  if (hasSources) {
    parts.push(`- Source snippets are treated as the primary grounding material for factual claims.`);
  } else {
    parts.push(`- No explicit sources to cite or mirror; response avoids pretending it has documents.`);
  }

  if (knobs.truncate) {
    parts.push(
      `\nNote: Truncated context is OFF in the baseline path — this version assumes the system sees the full input.`
    );
  }
  if (knobs.noise) {
    parts.push(
      `Note: Noisy/conflicting sources are interpreted by prioritizing the most recent or clearly authoritative snippet.`
    );
  }
  if (knobs.length) {
    parts.push(
      `Note: Even if the prompt is long or messy, the baseline behavior attempts to re-center on the core user ask.`
    );
  }
  if (knobs.constraints) {
    parts.push(
      `Note: Hard constraints (word count, format, tone) are treated as must-keep conditions in this baseline.`
    );
  }

  parts.push(
    `\n3. Example shape of the answer (sketch)\n- Opening: restate the ask in one sentence.\n- Middle: 3–5 bullets that reflect the key details from context/sources.\n- Closing: short summary that acknowledges any uncertainty or limits.`
  );

  return parts.join("\n");
}

// Stressed response generator per failure mode
function buildStressedResponse(mode, prompt, context, sources, knobs) {
  const promptShort = shortened(prompt, 140) || "Explain the requested topic clearly and accurately.";
  const hasContext = !!context.trim();
  const hasSources = !!sources.trim();

  const baseHeader = `(Stressed — demonstrating ${labelForMode(
    mode
  )})\n`;

  switch (mode) {
    case "hallucination": {
      const parts = [];
      parts.push(baseHeader);
      parts.push(`1. What goes wrong here`);
      parts.push(
        `- The system answers "${promptShort}" with very confident language, even when grounding is thin or missing.`
      );
      if (!hasSources) {
        parts.push(`- There are no explicit sources, but the response still invents detailed “facts”.`);
      } else {
        parts.push(
          `- It loosely echoes the sources but adds extra claims that are not supported by the snippets.`
        );
      }
      if (knobs.noise) {
        parts.push(`- Conflicting or noisy snippets push the model to improvise a story that “sounds right”.`);
      }
      if (knobs.truncate) {
        parts.push(
          `- Truncated context hides key constraints, so the answer fills the gap with plausible-sounding details.`
        );
      }

      parts.push(`\n2. How the output looks`);
      parts.push(`- Uses strong, authoritative tone ("definitely", "always", "guaranteed").`);
      parts.push(`- Includes specific numbers, timelines, or rules that were never mentioned in sources.`);
      parts.push(`- Rarely signals uncertainty or says "I don’t know".`);

      parts.push(`\n3. Interview lens`);
      parts.push(
        `You can point out that in this mode, the product needs stricter grounding contracts: forcing citations, limiting claims to retrieved snippets, or escalating when evidence is weak.`
      );

      return parts.join("\n");
    }

    case "compression": {
      const parts = [];
      parts.push(baseHeader);
      parts.push(`1. What goes wrong here`);
      parts.push(
        `- The system over-compresses "${promptShort}", dropping nuance and edge cases to stay brief.`
      );
      if (knobs.length) {
        parts.push(
          `- Long, messy prompts increase summarization pressure, making it more likely to discard subtle constraints.`
        );
      }
      if (knobs.constraints) {
        parts.push(
          `- Strict word-count or “keep it short” instructions reinforce the pressure to oversimplify.`
        );
      }

      parts.push(`\n2. How the output looks`);
      parts.push(`- 2–3 bullets instead of the richer detail that the context/sources justify.`);
      parts.push(`- Rare or risky conditions are omitted (“happy path only”).`);
      parts.push(
        `- The answer sounds clean and organized, but someone familiar with the system would notice missing caveats.`
      );

      parts.push(`\n3. Interview lens`);
      parts.push(
        `Here you can talk about balancing brevity with fidelity: using tiered summaries, expandable sections, or separate “risks & caveats” blocks instead of forcing one compressed answer.`
      );

      return parts.join("\n");
    }

    case "contradiction": {
      const parts = [];
      parts.push(baseHeader);
      parts.push(`1. What goes wrong here`);
      parts.push(
        `- Different parts of the answer to "${promptShort}" disagree with each other or with prior messages.`
      );
      if (hasSources) {
        parts.push(
          `- Some sentences mirror the sources, while others quietly contradict them — especially near the end.`
        );
      }
      if (knobs.noise) {
        parts.push(
          `- Noisy or conflicting sources tempt the model to “merge” incompatible truths instead of choosing one.`
        );
      }

      parts.push(`\n2. How the output looks`);
      parts.push(`- Early sentence: “We always retain this data for 7 years.”`);
      parts.push(`- Later sentence: “In some cases, this data may be deleted after 30 days.”`);
      parts.push(`- The tone stays calm, so the contradiction is easy to miss without close reading.`);

      parts.push(`\n3. Interview lens`);
      parts.push(
        `You can use this to argue for consistency checks, state tracking, or post-generation validation layers that detect when the model contradicts itself or canonical policy.`
      );

      return parts.join("\n");
    }

    case "context_collapse": {
      const parts = [];
      parts.push(baseHeader);
      parts.push(`1. What goes wrong here`);
      parts.push(
        `- The system forgets or underweights earlier parts of "${promptShort}" and over-focuses on the last detail.`
      );
      if (hasContext) {
        parts.push(`- Background context is dropped or treated as optional noise.`);
      }
      if (knobs.truncate) {
        parts.push(
          `- Truncation makes this worse — older constraints literally fall out of the context window.`
        );
      }
      if (knobs.length) {
        parts.push(
          `- Long prompts with many instructions encourage the model to latch onto whichever part feels most salient.`
        );
      }

      parts.push(`\n2. How the output looks`);
      parts.push(`- The answer technically addresses one part of the ask, but ignores others.`);
      parts.push(`- Format or tone rules near the top of the prompt are lost.`);
      parts.push(`- Sources may be barely used or omitted entirely.`);

      parts.push(`\n3. Interview lens`);
      parts.push(
        `This is a good place to discuss prompt structuring, explicit contracts for “persistent constraints”, and architectural fixes like system messages, memory layers, or retrieval instead of giant monolithic prompts.`
      );

      return parts.join("\n");
    }

    case "grounding_failure": {
      const parts = [];
      parts.push(baseHeader);
      parts.push(`1. What goes wrong here`);
      parts.push(
        `- The system answers "${promptShort}" in a way that does not faithfully reflect the provided sources.`
      );
      if (hasSources) {
        parts.push(
          `- It selectively quotes or paraphrases snippets but introduces extra structure not supported by the text.`
        );
      } else {
        parts.push(
          `- With no sources, the system still behaves as if it has documents, inventing citations or sections.`
        );
      }
      if (knobs.noise) {
        parts.push(
          `- When snippets disagree, the model “averages” them into a neat story instead of exposing the conflict.`
        );
      }

      parts.push(`\n2. How the output looks`);
      parts.push(`- References sections, tables, or rules that do not actually exist in the snippets.`);
      parts.push(`- Uses phrases like “according to the documentation” without clear, checkable grounding.`);
      parts.push(
        `- If users compare the answer to the source, they notice subtle mismatches in thresholds, timelines, or scope.`
      );

      parts.push(`\n3. Interview lens`);
      parts.push(
        `You can talk about strict grounding: constraining the model to quote, summarize, or transform only retrieved text, plus UX patterns that expose source links and highlight uncertainty instead of hiding it.`
      );

      return parts.join("\n");
    }

    default:
      return baseHeader + "\nAn unspecified failure mode was selected.";
  }
}

function labelForMode(mode) {
  switch (mode) {
    case "hallucination":
      return "Hallucination";
    case "compression":
      return "Compression";
    case "contradiction":
      return "Contradiction";
    case "context_collapse":
      return "Context Collapse";
    case "grounding_failure":
      return "Grounding Failure";
    default:
      return mode;
  }
}

// "What to watch for" text
function buildWatchText(mode) {
  switch (mode) {
    case "hallucination":
      return (
        "Compare how the stressed response confidently adds details not present in the sources, " +
        "while the baseline stays closer to the provided snippets. Look for invented numbers, " +
        "policies, or guarantees that you could not verify in the grounding text."
      );
    case "compression":
      return (
        "Watch how the stressed response becomes shorter and loses nuance compared to the baseline. " +
        "Edge cases, caveats, and risk language are often the first to disappear, even when they matter."
      );
    case "contradiction":
      return (
        "Scan the stressed response for internal contradictions: early claims that are quietly reversed later. " +
        "In an interview, point out how this undermines trust even when each individual sentence sounds reasonable."
      );
    case "context_collapse":
      return (
        "Notice which parts of the prompt the stressed response ignores — often earlier constraints or context. " +
        "The baseline attempts to balance the whole ask; the stressed version over-focuses on one slice."
      );
    case "grounding_failure":
      return (
        "Compare the stressed response directly to the source snippets. Look for mismatched thresholds, " +
        "invented structure, or confident language that doesn’t actually line up with the provided text."
      );
    default:
      return (
        "Once you generate responses, look for how the stressed output diverges from the baseline in a way that " +
        "matches the selected failure mode."
      );
  }
}

// Handle presets
presetButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-preset");
    const preset = PRESETS[key];
    if (!preset) return;

    promptInput.value = preset.prompt;
    contextInput.value = preset.context;
    sourcesInput.value = preset.sources;

    setStatus(`Loaded ${presetPromptLabel(key)} preset.`);
  });
});

function presetPromptLabel(key) {
  switch (key) {
    case "policy":
      return "Policy";
    case "support":
      return "Support";
    case "analysis":
      return "Analysis";
    default:
      return key;
  }
}

// Main generate handler
generateBtn.addEventListener("click", () => {
  const prompt = trimOrFallback(
    promptInput.value,
    "Explain this system behavior in a way that a stakeholder can understand."
  );
  const context = contextInput.value || "";
  const sources = sourcesInput.value || "";

  const mode = modeSelect.value || "hallucination";

  const knobs = {
    truncate: toggleTruncate.checked,
    noise: toggleNoise.checked,
    length: toggleLength.checked,
    constraints: toggleConstraints.checked
  };

  // Simple UX: warn if everything is empty
  if (!promptInput.value.trim() && !context.trim() && !sources.trim()) {
    summaryWarn(
      "No real inputs provided — using a generic prompt. For richer demos, load a preset or add your own text."
    );
  } else {
    summaryOk(`Generated baseline and stressed responses for: ${labelForMode(mode)}.`);
  }

  // Update pill + meta
  const modeLabel = labelForMode(mode);
  modePillEl.textContent = modeLabel;
  stressedMetaEl.innerHTML = `Simulated response under: <strong>${modeLabel}</strong>.`;

  // Generate responses
  const baseline = buildBaselineResponse(prompt, context, sources, knobs);
  const stressed = buildStressedResponse(mode, prompt, context, sources, knobs);

  baselineTextEl.textContent = baseline;
  stressedTextEl.textContent = stressed;

  // Watch text
  watchTextEl.textContent = buildWatchText(mode);

  // Status
  const activeKnobs = Object.entries(knobs)
    .filter(([_, v]) => v)
    .map(([k]) => k.replace("_", " "));
  setStatus(
    "Generated with failure mode: " +
      modeLabel +
      (activeKnobs.length ? " · knobs: " + activeKnobs.join(", ") : " · knobs: none")
  );
});

// Initial state
summaryIdle(
  "No responses yet. Add a prompt (or use a preset), choose a failure mode, then click Generate Responses."
);
setStatus("");
