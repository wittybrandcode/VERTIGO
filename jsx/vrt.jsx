/* VERTIGO vrt.jsx — SOLE ENTRY POINT. Loads the library modules.
 * Do not add logic here. Order matters: core first.
 * Modules: vrt-core (helpers) → vrt-camera → vrt-track → vrt-rail.
 * Every exposed function returns a '{"ok":...}' string, never throws outward. */
#include "vrt-core.jsx"
#include "vrt-camera.jsx"
#include "vrt-track.jsx"
#include "vrt-rail.jsx"
