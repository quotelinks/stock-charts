# Changelog

## 1.0.1 (2026-10-28)

Fix: "ResizeObserver loop completed with undelivered notifications" console error. Re-render on resize now runs on the next animation frame, reacts to width changes only, and ignores a page scrollbar toggling the width back and forth.

## 1.0.0 (2026-10-28)

First release. Nine chart types: `price-target`, `analyst-gauge`, `target-range`, `analyst-ratings`, `ratings-trend`, `price-chart`, `range-performance`, `dividend-history`, `earnings-surprise`. Data via `data-src`, inline JSON or `QLCharts.render()`. Light, dark and auto themes. JSON Schemas for every type.
