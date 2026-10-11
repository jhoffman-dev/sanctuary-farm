## The browser page around the web export. Off the web every call is a no-op
## (or the safe default), so the editor and desktop runs behave the same.
class_name WebPage
extends RefCounted


## The OS "reduce motion" setting, read from the page's media query. Godot has
## no engine-level query for it, so outside the browser this is false.
static func prefers_reduced_motion() -> bool:
	if not OS.has_feature("web"):
		return false
	var matches: Variant = JavaScriptBridge.eval(
		"window.matchMedia('(prefers-reduced-motion: reduce)').matches", true
	)
	return matches == true


## Mirrors a value onto `<body data-*>`. The canvas has no DOM text, so this is
## how the Playwright smoke (game/tests/web) reads the pad, as the r3f client
## once published its renderer stats to the DOM.
static func publish(key: String, value: String) -> void:
	if not OS.has_feature("web"):
		return
	JavaScriptBridge.eval(
		"document.body.dataset[%s] = %s" % [JSON.stringify(key), JSON.stringify(value)], true
	)
