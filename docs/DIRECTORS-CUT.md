# Zo Moments Director's Cut

Zo Moments turns a selected group of private moments into a social-ready story. The production unit is a **director's plan**, not a free-form prompt or a generic slideshow.

## Product Contract

One plan controls the story arc, scene order, payoff image, camera treatment, transitions, soundtrack accents and final destination format. Users can choose the payoff moment; the rest of the plan stays grounded in their story blueprint and selected media.

The first release is deliberately deterministic. It always creates a shareable export in the browser, even if no model, network connection or AI budget is available.

## Zo-Native Architecture

```text
Private Zo Moments space
  -> authenticated media + story blueprint
  -> director plan (current deterministic path; optional Zo AI enrichment next)
  -> renderer (browser Canvas + MediaRecorder)
  -> preflight checks
  -> private reusable social export in Zo persistent storage
  -> native device share sheet or download
```

The Hono API owns identity, membership checks, story metadata and private export storage. The React client renders the first export locally so the user receives a preview immediately. The API persists that export in the background for future download or sharing.

## Current Director's Cut

- Uses the story's existing chapter blueprint as the narrative source of truth.
- Lets the user choose the payoff image for motion exports.
- Assigns an opening, journey, build, payoff and closing across a contiguous timeline.
- Gives the payoff a longer hold, focused push-in, dip-to-ink transition, gold bloom and soundtrack impact.
- Validates coverage, complete arc, camera variation and payoff before rendering.
- Saves only private exports; Zo Moments never posts to a social network without the device share confirmation.

## Next Zo Stages

1. **Vision enrichment:** call Zo's configured model on an explicitly selected set of media to propose grounded scene tags, composition notes and identity constraints. Keep the deterministic plan when the call is unavailable.
2. **Plan persistence:** version the director plan with the story canvas, hash the input moments and cache matching plans and exports in persistent Zo storage.
3. **Render worker:** move heavy video composition to an internal Zo process service using FFmpeg so exports survive browser closure and can reach higher fidelity.
4. **Quality gate:** analyse rendered frames and audio for black frames, unsafe text zones, duration, scene coverage and silent audio. A failed enhanced render falls back to the verified deterministic export.
5. **Cost governor:** show an estimate before any paid enhanced generation, reserve a per-story budget and never re-run an identical request.

## Boundaries

Media stays behind Zo Moments' existing authenticated routes. AI assistance must be explicit, use only the media selected for that render, and never make a public object URL. The reliable local renderer is not a degraded afterthought; it is the default path that makes the feature work for every private space.
