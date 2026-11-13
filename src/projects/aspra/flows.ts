/**
 * Aspra's user flows, traced from the app's navigation state (Shell's `entry`, the store's `tab`, each
 * flow's own `stage` / step, and the sheets). Every screen is the real app, reached by pressing the listed
 * controls from a starting preview; every step cites the state change in the repo that makes it happen.
 */
import type { Flow, FlowScreen } from "@/project/flows"

const APP = "components/aspra/app.tsx"
const BOOKING = "components/aspra/entry/booking-flow.tsx"
const ENTRY = "components/aspra/entry/guest-entry.tsx"
const TODAY = "components/aspra/tabs/today.tsx"
const PLAN = "components/aspra/tabs/plan.tsx"
const STAY = "components/aspra/stay-sheet.tsx"

/** Screens that follow one another: each is the one before it plus one more press. */
function path(base: string, steps: Array<Omit<FlowScreen, "base" | "drive"> & { press?: string }>, start: string[] = []): FlowScreen[] {
  const drive = [...start]
  return steps.map(({ press, ...s }) => {
    if (press) drive.push(press)
    return { ...s, base, drive: [...drive] }
  })
}

const gate: Omit<FlowScreen, "base" | "drive"> = { id: "gate", title: "Gate", component: "Gate", note: "Opens after the 1.9s splash." }

export const flows: Flow[] = [
  {
    id: "first-booking",
    title: "Book a first stay",
    goal: "A new guest picks a suite and dates, shapes the stay and confirms.",
    screens: path("screen-app", [
      { ...gate, press: "see:Plan a stay" },
      { id: "suite", title: "Choose a suite", component: "BookingFlow", press: "Plan a stay", action: "Tap “Plan a stay”", via: { file: APP, call: 'setEntry(k)' } },
      { id: "dates", title: "When are you coming?", component: "BookingFlow", press: "Continue", action: "Continue", via: { file: BOOKING, call: "go(1)" } },
      { id: "extras", title: "Shape the stay", component: "BookingFlow", press: "Continue", action: "Continue", via: { file: BOOKING, call: "go(1)" } },
      { id: "trip", title: "How do you like to travel?", component: "BookingFlow", press: "Continue", action: "Continue", via: { file: BOOKING, call: "go(1)" } },
      { id: "room", title: "Set up your suite", component: "BookingFlow", press: "Continue", action: "Continue", via: { file: BOOKING, call: "go(1)" } },
      { id: "review", title: "Check and confirm", component: "BookingFlow", press: "Continue", action: "Continue", via: { file: BOOKING, call: "go(1)" } },
      { id: "confirmed", title: "Booking confirmed", component: "Confirmed", press: "Confirm booking", action: "Tap “Confirm booking”", via: { file: BOOKING, call: 'setPhase("before")' }, note: "The sample guest's name and email are filled in, so the form passes." },
      { id: "today", title: "Today · before the stay", component: "TodayTab", press: "Open my trip", action: "Tap “Open my trip”", via: { file: APP, call: 'setEntry("app")' } },
    ]),
    exits: [
      { from: "suite", label: "Close, with choices made", to: "“Leave this booking?” sheet", via: { file: BOOKING, call: "setLeaving(true)" } },
      { from: "room", label: "Set it up in 3D", to: "3D suite tour (not on the canvas)" },
    ],
  },
  {
    id: "open-booking",
    title: "Open an existing booking and prepare the stay",
    goal: "A booked guest finds the reservation and tells the hotel how they like their days and their suite.",
    screens: path("screen-app", [
      { ...gate, press: "see:Plan a stay" },
      { id: "find", title: "Find your booking", component: "BookedEntry", press: "I have a booking", action: "Tap “I have a booking”", via: { file: APP, call: "setEntry(k)" } },
      { id: "welcome", title: "Welcome", component: "BookedEntry", press: "Find booking", action: "Tap “Find booking”", via: { file: ENTRY, call: 'setStage("welcome")' }, note: "The demo reference and last name are filled in." },
      { id: "days", title: "Your days on Milos", component: "BookedEntry", press: "Prepare my stay", action: "Tap “Prepare my stay”", via: { file: ENTRY, call: 'setStage("trip")' } },
      { id: "suite", title: "Your suite", component: "BookedEntry", press: "Continue", action: "Continue", via: { file: ENTRY, call: 'setStage("room")' } },
      { id: "today", title: "Today · before the stay", component: "TodayTab", press: "Save and open my trip", action: "Tap “Save and open my trip”", via: { file: APP, call: 'setEntry("app")' } },
    ]),
    exits: [
      { from: "welcome", label: "Skip, go to my trip", to: "Today · before the stay", toScreen: "open-booking/today", via: { file: APP, call: 'setEntry("app")' } },
      { from: "suite", label: "Set it up in 3D", to: "3D suite tour (not on the canvas)", via: { file: ENTRY, call: "setTour(true)" } },
    ],
  },
  {
    id: "return-rebook",
    title: "Come back and book the same suite again",
    goal: "A returning guest is recognised and rebooks with their preferences kept.",
    screens: path("screen-app", [
      { ...gate, press: "see:Plan a stay" },
      { id: "welcome-back", title: "Welcome back", component: "ReturningEntry", press: "I have stayed before", action: "Tap “I have stayed before”", via: { file: APP, call: "setEntry(k)" } },
      { id: "suite", title: "Book again · choose a suite", component: "BookingFlow", press: "Book", action: "Tap “Book … again”", via: { file: APP, call: 'setEntry("rebook")' } },
      { id: "dates", title: "Book again · dates", component: "BookingFlow", press: "Continue", action: "Continue", via: { file: BOOKING, call: "go(1)" } },
      { id: "extras", title: "Book again · extras", component: "BookingFlow", press: "Continue", action: "Continue", via: { file: BOOKING, call: "go(1)" } },
      { id: "review", title: "Book again · check and confirm", component: "BookingFlow", press: "Continue", action: "Continue", via: { file: BOOKING, call: "go(1)" }, note: "Returning guests skip the two preference steps." },
      { id: "confirmed", title: "Booking confirmed", component: "Confirmed", press: "Confirm booking", action: "Tap “Confirm booking”", via: { file: BOOKING, call: 'setPhase("before")' } },
    ]),
    exits: [{ from: "welcome-back", label: "Look through my last trip", to: "Journal · after the stay", toScreen: "after-stay/journal", via: { file: APP, call: 'setTab("journal")' } }],
  },
  {
    id: "plan-days",
    title: "Plan the days of the stay",
    goal: "A booked guest looks at each day and adds experiences to it.",
    screens: path("screen-today-before", [
      { press: "see:tab:Plan", id: "today", title: "Today · before the stay", component: "TodayTab", note: "Booked guest Clara Weiss, restored from a saved session." },
      { id: "plan", title: "Plan", component: "PlanTab", press: "tab:Plan", action: "Tap the Plan tab (or “Open plan”)", via: { file: TODAY, call: 'setTab("plan")' } },
      { id: "add", title: "Add to a day", component: "PlanTab", press: "Add", action: "Tap “Add”", via: { file: PLAN, call: "setAdding(true)" } },
    ]),
    exits: [
      { from: "plan", label: "Plan it for me", to: "Nefeli, with the request sent", toScreen: "concierge/nefeli" },
      { from: "plan", label: "Change dates or extras", to: "Your stay sheet", toScreen: "manage-stay/stay", via: { file: PLAN, call: "setStayOpen(true)" } },
    ],
  },
  {
    id: "concierge",
    title: "Ask the concierge",
    goal: "During the stay, a guest asks Nefeli for help.",
    screens: path("screen-today-during", [
      { press: "see:tab:Plan", id: "today", title: "Today · during the stay", component: "TodayTab" },
      { id: "nefeli", title: "Nefeli", component: "ConciergeTab", press: "tab:Nefeli", action: "Tap the Nefeli tab", via: { file: APP, call: "setTab(t.id)" }, note: "Empty conversation: replies come from /api/chat, which the canvas does not run." },
    ]),
  },
  {
    id: "manage-stay",
    title: "Manage the stay and preferences",
    goal: "A booked guest checks cost, changes extras and edits preferences.",
    screens: path("screen-today-before", [
      { press: "see:tab:Plan", id: "today", title: "Today · before the stay", component: "TodayTab" },
      { id: "stay", title: "Your stay", component: "StaySheet", press: "Manage stay", action: "Tap “Manage stay”", via: { file: TODAY, call: "setStayOpen(true)" } },
      { id: "profile", title: "Profile and preferences", component: "ProfileSheet", press: "Preferences", action: "Tap “Preferences”", via: { file: STAY, call: "setProfileOpen(true)" } },
      { id: "gate", title: "Gate", component: "Gate", press: "Switch sample guest", action: "Tap “Switch sample guest”", via: { file: APP, call: 'setEntry("gate")' } },
    ]),
    exits: [
      { from: "stay", label: "Set it up in 3D", to: "3D suite tour (not on the canvas)", via: { file: STAY, call: "setTourOpen(true)" } },
      { from: "profile", label: "Your stay: dates, cost and extras", to: "Your stay", toScreen: "manage-stay/stay", via: { file: APP, call: "setStayOpen(true)" } },
    ],
  },
  {
    id: "after-stay",
    title: "Look back on the stay and book it again",
    goal: "After checkout, a guest revisits the trip and rebooks the same week.",
    screens: path("screen-today-after", [
      { press: "see:tab:Plan", id: "today", title: "Today · after the stay", component: "TodayTab", note: "Booked guest with the phase set to “after”." },
      { id: "journal", title: "Journal", component: "JournalTab", press: "Open your journal", action: "Tap “Open your journal” (or the Journal tab)", via: { file: TODAY, call: 'setTab("journal")' } },
    ]),
    exits: [{ from: "today", label: "Book the same week again", to: "Book again · choose a suite", toScreen: "return-rebook/suite", via: { file: TODAY, call: "event aspra:rebook" } }],
  },
]
