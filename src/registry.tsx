import type { ComponentType } from "react"
import { WeatherWidget } from "@/components/motion/weather-widget"
import { MoodSlider } from "@/components/motion/mood-slider"
import { MusicPlayer } from "@/components/motion/music-player"
import { MorphButton } from "@/components/motion/morph-button"
import { DayNightSwitch } from "@/components/motion/day-night-switch"
import { SlidingTabs } from "@/components/motion/sliding-tabs"
import { OtpInput } from "@/components/motion/otp-input"
import { TodoList } from "@/components/motion/todo-list"
import { NotificationStack } from "@/components/motion/notification-stack"
import { StatCard } from "@/components/motion/stat-card"
import { ReactionButton } from "@/components/motion/reaction-button"
import { StarRating } from "@/components/motion/star-rating"
import { Dock } from "@/components/motion/dock"
import { FilterChart } from "@/components/motion/filter-chart"
import { Bookshelf } from "@/components/motion/bookshelf"
import { SwipeCards } from "@/components/motion/swipe-cards"
import { PriceRange } from "@/components/motion/price-range"
import { RotaryKnob } from "@/components/motion/rotary-knob"
import { SpotlightCard } from "@/components/motion/spotlight-card"
import { Reasoning } from "@/components/motion/reasoning"
import { PromptInput } from "@/components/motion/prompt-input"
import { AgentTask } from "@/components/motion/agent-task"
import { VoiceInput } from "@/components/motion/voice-input"
import { Marquee } from "@/components/motion/marquee"
import { TiltTicket } from "@/components/motion/tilt-ticket"
import { PopoverForm } from "@/components/motion/popover-form"
import { PomodoroTimer } from "@/components/motion/pomodoro-timer"
import { SwipeToDelete } from "@/components/motion/swipe-to-delete"
import { SlideToConfirm } from "@/components/motion/slide-to-confirm"
import { TimelineScrubber } from "@/components/motion/timeline-scrubber"
import { DonutBreakdown } from "@/components/motion/donut-breakdown"
import { LightSwitch } from "@/components/motion/light-switch"
import { NotebookFlip } from "@/components/motion/notebook-flip"
import { AnimatedAccordion } from "@/components/motion/animated-accordion"
import { CommandPalette } from "@/components/motion/command-palette"
import { TestimonialStack } from "@/components/motion/testimonial-stack"
import { FeatureBento } from "@/components/motion/feature-bento"
import { ImageGeneration } from "@/components/motion/image-generation"
import { SpringLab } from "@/canvas/spring-lab"
import { IntroNote } from "@/canvas/intro-note"

export type Entry = {
  kind: string
  title: string
  /** which shadcn primitive the extension builds on */
  base: string
  /** source file in components/motion (also the registry item name) */
  file?: string
  component: ComponentType
}

export const registry: Record<string, Entry> = {
  intro: { kind: "intro", title: "Start here", base: "—", component: IntroNote },
  pomodoro: { kind: "pomodoro", title: "Pomodoro Timer", base: "Card · Tabs · Button", component: PomodoroTimer, file: "pomodoro-timer" },
  swipedel: { kind: "swipedel", title: "Swipe to Delete", base: "Button", component: SwipeToDelete, file: "swipe-to-delete" },
  slideconfirm: { kind: "slideconfirm", title: "Slide to Confirm", base: "Card · Button", component: SlideToConfirm, file: "slide-to-confirm" },
  timeline: { kind: "timeline", title: "Timeline Scrubber", base: "Slider · Card · Button", component: TimelineScrubber, file: "timeline-scrubber" },
  donut: { kind: "donut", title: "Donut Breakdown", base: "Card · Tabs", component: DonutBreakdown, file: "donut-breakdown" },
  lightswitch: { kind: "lightswitch", title: "Retro Light Switch", base: "Switch", component: LightSwitch, file: "light-switch" },
  notebook: { kind: "notebook", title: "Notebook Page Flip", base: "Card · Button", component: NotebookFlip, file: "notebook-flip" },
  accordion: { kind: "accordion", title: "Accordion", base: "Accordion", component: AnimatedAccordion, file: "animated-accordion" },
  command: { kind: "command", title: "Command Palette", base: "Command", component: CommandPalette, file: "command-palette" },
  testimonials: { kind: "testimonials", title: "Testimonial Stack", base: "Card · Button", component: TestimonialStack, file: "testimonial-stack" },
  bento: { kind: "bento", title: "Feature Bento", base: "Card", component: FeatureBento, file: "feature-bento" },
  imagegen: { kind: "imagegen", title: "Image Generation", base: "Card · Input · Button", component: ImageGeneration, file: "image-generation" },
  springlab: { kind: "springlab", title: "Spring Lab", base: "—", component: SpringLab },

  weather: { kind: "weather", title: "Weather Widget", base: "Card · Tabs", component: WeatherWidget, file: "weather-widget" },
  mood: { kind: "mood", title: "Mood Slider", base: "Slider", component: MoodSlider, file: "mood-slider" },
  music: { kind: "music", title: "Music Player", base: "Card · Slider · Button", component: MusicPlayer, file: "music-player" },
  morph: { kind: "morph", title: "Morph Button", base: "Button", component: MorphButton, file: "morph-button" },
  daynight: { kind: "daynight", title: "Day / Night Switch", base: "Switch", component: DayNightSwitch, file: "day-night-switch" },
  tabs: { kind: "tabs", title: "Sliding Tabs", base: "Tabs · Input · Button", component: SlidingTabs, file: "sliding-tabs" },
  otp: { kind: "otp", title: "OTP Input", base: "Input OTP", component: OtpInput, file: "otp-input" },
  todo: { kind: "todo", title: "Todo Checklist", base: "Checkbox", component: TodoList, file: "todo-list" },
  notify: { kind: "notify", title: "Notification Stack", base: "Card · Button", component: NotificationStack, file: "notification-stack" },
  stat: { kind: "stat", title: "Stat Card", base: "Card · Badge · Button", component: StatCard, file: "stat-card" },
  reaction: { kind: "reaction", title: "Social Post", base: "Card · Button · Input", component: ReactionButton, file: "reaction-button" },
  rating: { kind: "rating", title: "Star Rating", base: "Button", component: StarRating, file: "star-rating" },
  dock: { kind: "dock", title: "Dock", base: "Button", component: Dock, file: "dock" },
  chart: { kind: "chart", title: "Filter Chart", base: "Card · Tabs · Button", component: FilterChart, file: "filter-chart" },
  shelf: { kind: "shelf", title: "Bookshelf", base: "Card · Button", component: Bookshelf, file: "bookshelf" },
  swipe: { kind: "swipe", title: "Swipe Cards", base: "Card · Button", component: SwipeCards, file: "swipe-cards" },
  range: { kind: "range", title: "Price Range", base: "Slider · Card", component: PriceRange, file: "price-range" },
  knob: { kind: "knob", title: "Volume Knob", base: "Slider · Button", component: RotaryKnob, file: "rotary-knob" },
  spotlight: { kind: "spotlight", title: "Spotlight Card", base: "Card · Badge · Switch · Button", component: SpotlightCard, file: "spotlight-card" },
  reasoning: { kind: "reasoning", title: "Reasoning", base: "Card · Button · Reasoning pattern", component: Reasoning, file: "reasoning" },
  prompt: { kind: "prompt", title: "Prompt Input", base: "Textarea · Button · Prompt Input pattern", component: PromptInput, file: "prompt-input" },
  agent: { kind: "agent", title: "Agent Task", base: "Card · Button · Task pattern", component: AgentTask, file: "agent-task" },
  voice: { kind: "voice", title: "Voice ↔ Text Input", base: "Input · Button", component: VoiceInput, file: "voice-input" },
  marquee: { kind: "marquee", title: "Marquee", base: "Badge", component: Marquee, file: "marquee" },
  ticket: { kind: "ticket", title: "Tilt Ticket", base: "Card · Button", component: TiltTicket, file: "tilt-ticket" },
  popform: { kind: "popform", title: "Popover Form", base: "Button · Textarea", component: PopoverForm, file: "popover-form" },
}

/** The curated catalogue: a few categories, a handful of components each. */
export type Category = { id: string; title: string; blurb: string; built: string[]; next: string[] }
export const categories: Category[] = [
  {
    id: "fun",
    title: "Fun widgets",
    blurb: "Small, delightful, shareable",
    built: ["weather", "music", "reaction", "rating", "dock", "pomodoro"],
    next: [],
  },
  {
    id: "swipe",
    title: "Swipe & gesture",
    blurb: "Drag, fling, reorder, dismiss",
    built: ["swipe", "notify", "todo", "swipedel", "slideconfirm"],
    next: [],
  },
  {
    id: "sliders",
    title: "Sliders",
    blurb: "One value, lots of feeling",
    built: ["mood", "range", "knob", "timeline"],
    next: [],
  },
  {
    id: "data",
    title: "Data & charts",
    blurb: "Numbers that move when filters do",
    built: ["chart", "stat", "donut"],
    next: [],
  },
  {
    id: "skeuo",
    title: "Skeuomorphic",
    blurb: "Real-world materials and physics",
    built: ["shelf", "daynight", "ticket", "lightswitch", "notebook"],
    next: [],
  },
  {
    id: "core",
    title: "Core controls",
    blurb: "Everyday shadcn, upgraded",
    built: ["morph", "tabs", "otp", "popform", "accordion", "command"],
    next: [],
  },
  {
    id: "landing",
    title: "Landing page",
    blurb: "Sections that sell the product",
    built: ["spotlight", "marquee", "testimonials", "bento"],
    next: [],
  },
  {
    id: "ai",
    title: "AI",
    blurb: "Thinking, prompting and agents, animated",
    built: ["reasoning", "prompt", "agent", "voice", "imagegen"],
    next: [],
  },
]

export type FrameData = {
  id: string
  kind: string
  x: number
  y: number
  w: number
  theme?: string
  mode?: "light" | "dark"
  group?: "compare"
  state?: "enabled" | "hover" | "disabled"
  radius?: number
}

export const COL = 440
export const W = 400
export const ROW = 720
export const SECTION_X = 0

export const initialFrames = (): FrameData[] => [
  { id: "intro", kind: "intro", x: -COL - 80, y: 0, w: W },
  { id: "springlab", kind: "springlab", x: -COL - 80, y: ROW, w: W },
  ...categories.flatMap((c, r) => c.built.map((kind, i) => ({ id: kind, kind, x: SECTION_X + i * COL, y: r * ROW, w: W }))),
]
