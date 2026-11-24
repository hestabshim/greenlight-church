/**
 * Dev-only tuning panel for <traffic-glow>. Imported dynamically behind
 * `import.meta.env.DEV`, so it is not part of production builds.
 *
 * Every change is saved to localStorage (only values that differ from the
 * defaults, so changing a default in code still takes effect). "Copy" puts
 * the full settings on the clipboard to paste into DEFAULTS.
 */
import "./TrafficGlowPanel.css"

type Value = number | string
type Settings = Record<string, Value>

export type TuningHost = {
	mount: HTMLElement
	defaults: Settings
	getSettings(): Settings
	apply(next: Settings): void
	togglePause(): boolean
}

type Slider = {
	key: string
	label: string
	min: number
	max: number
	step: number
}

const GROUPS: { title: string; sliders: Slider[] }[] = [
	{
		title: "Light",
		sliders: [
			{ key: "opacity", label: "Opacity", min: 0, max: 1, step: 0.01 },
			{ key: "exposure", label: "Exposure", min: 0.2, max: 5, step: 0.01 },
			{ key: "saturation", label: "Saturation", min: 0, max: 2, step: 0.01 },
			{ key: "size", label: "Size", min: 0.1, max: 1.5, step: 0.01 },
			{ key: "softness", label: "Softness", min: 0.01, max: 1, step: 0.01 },
			{ key: "bleed", label: "Bleed", min: 0, max: 1.5, step: 0.01 },
			{ key: "fringe", label: "Fringe", min: 0, max: 0.3, step: 0.005 },
			{ key: "aberration", label: "Aberration", min: 0, max: 0.15, step: 0.001 },
		],
	},
	{
		title: "Motion",
		sliders: [
			{ key: "speed", label: "Speed", min: 0, max: 5, step: 0.01 },
			{ key: "drift", label: "Wander", min: 0, max: 1, step: 0.01 },
			{ key: "spread", label: "Spread", min: 0, max: 2, step: 0.01 },
			{ key: "warp", label: "Warp", min: 0, max: 1, step: 0.01 },
		],
	},
	{
		title: "Signal shadow",
		sliders: [
			{ key: "signal", label: "Darkness", min: 0, max: 1, step: 0.01 },
			{ key: "signalSize", label: "Size", min: 0.2, max: 3, step: 0.01 },
			{ key: "signalPosX", label: "X", min: -1, max: 1, step: 0.01 },
			{ key: "signalPosY", label: "Y", min: -1, max: 1, step: 0.01 },
			{ key: "signalTilt", label: "Tilt", min: -0.5, max: 0.5, step: 0.01 },
			{ key: "lightDirection", label: "Light dir", min: 0, max: 6.28, step: 0.01 },
			{ key: "lightLength", label: "Cast length", min: 0, max: 1.5, step: 0.01 },
			{ key: "penumbra", label: "Penumbra", min: 0, max: 1, step: 0.01 },
		],
	},
	{
		title: "Surface",
		sliders: [
			{ key: "frame", label: "Frame shadow", min: 0, max: 1, step: 0.01 },
			{ key: "grain", label: "Grain", min: 0, max: 0.2, step: 0.005 },
			{ key: "resolution", label: "Resolution", min: 0.2, max: 1, step: 0.05 },
		],
	},
	{
		title: "Lamps",
		sliders: [
			{ key: "red", label: "Red", min: 0, max: 2, step: 0.01 },
			{ key: "yellow", label: "Yellow", min: 0, max: 2, step: 0.01 },
			{ key: "green", label: "Green", min: 0, max: 2, step: 0.01 },
		],
	},
]

const COLORS = [
	{ key: "redColor", label: "Red hue" },
	{ key: "yellowColor", label: "Yellow hue" },
	{ key: "greenColor", label: "Green hue" },
]

const STORAGE_KEY = "traffic-glow"
const PANEL_KEY = "traffic-glow:panel-hidden"

function load(defaults: Settings): Settings {
	const settings = { ...defaults }
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}")
		// Only keep keys that still exist, with matching types.
		for (const key of Object.keys(defaults)) {
			if (typeof parsed[key] === typeof defaults[key]) settings[key] = parsed[key]
		}
	} catch {}
	return settings
}

function save(settings: Settings, defaults: Settings) {
	const changed: Settings = {}
	for (const key of Object.keys(defaults)) {
		if (settings[key] !== defaults[key]) changed[key] = settings[key]
	}
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(changed))
	} catch {}
}

/** Applies saved settings, mounts the panel, and returns a cleanup function. */
export function attachTuningPanel(host: TuningHost): () => void {
	host.apply(load(host.defaults))

	const set = (key: string, value: Value) => {
		host.apply({ ...host.getSettings(), [key]: value })
		save(host.getSettings(), host.defaults)
	}

	const panel = document.createElement("div")
	panel.className = "traffic-glow__panel"
	panel.hidden = localStorage.getItem(PANEL_KEY) === "true"
	panel.innerHTML = `<header><span>Traffic glow</span><kbd>\` to hide</kbd></header>`

	const sync: (() => void)[] = []

	const row = (label: string) => {
		const el = document.createElement("label")
		el.className = "traffic-glow__row"
		const span = document.createElement("span")
		span.textContent = label
		el.append(span)
		return el
	}

	for (const group of GROUPS) {
		const title = document.createElement("div")
		title.className = "traffic-glow__group"
		title.textContent = group.title
		panel.append(title)

		for (const sl of group.sliders) {
			const el = row(sl.label)
			const input = document.createElement("input")
			input.type = "range"
			input.min = String(sl.min)
			input.max = String(sl.max)
			input.step = String(sl.step)
			const out = document.createElement("output")
			const show = () => {
				const v = Number(host.getSettings()[sl.key])
				input.value = String(v)
				out.textContent = v.toFixed(sl.step < 0.01 ? 3 : 2)
			}
			show()
			sync.push(show)
			input.addEventListener("input", () => {
				set(sl.key, Number(input.value))
				show()
			})
			el.append(input, out)
			panel.append(el)
		}

		if (group.title === "Lamps") {
			for (const c of COLORS) {
				const el = row(c.label)
				const input = document.createElement("input")
				input.type = "color"
				const show = () => {
					input.value = String(host.getSettings()[c.key])
				}
				show()
				sync.push(show)
				input.addEventListener("input", () => set(c.key, input.value))
				el.append(input, document.createElement("output"))
				panel.append(el)
			}
		}
	}

	const buttons = document.createElement("div")
	buttons.className = "traffic-glow__buttons"
	const button = (label: string, onClick: (b: HTMLButtonElement) => void) => {
		const b = document.createElement("button")
		b.type = "button"
		b.textContent = label
		b.addEventListener("click", () => onClick(b))
		buttons.append(b)
	}
	button("Pause", (b) => {
		b.textContent = host.togglePause() ? "Play" : "Pause"
	})
	button("Reset", () => {
		if (!confirm("Reset all sliders to defaults?")) return
		host.apply({ ...host.defaults })
		save(host.getSettings(), host.defaults)
		for (const fn of sync) fn()
	})
	button("Copy", async (b) => {
		await navigator.clipboard.writeText(
			JSON.stringify(host.getSettings(), null, 4),
		)
		b.textContent = "Copied"
		setTimeout(() => {
			b.textContent = "Copy"
		}, 1200)
	})
	panel.append(buttons)
	host.mount.append(panel)

	const onKey = (e: KeyboardEvent) => {
		if (e.key !== "`") return
		panel.hidden = !panel.hidden
		localStorage.setItem(PANEL_KEY, String(panel.hidden))
	}
	window.addEventListener("keydown", onKey)

	return () => {
		window.removeEventListener("keydown", onKey)
		panel.remove()
	}
}
