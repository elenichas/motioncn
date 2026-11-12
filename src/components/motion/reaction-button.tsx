import { useState, type FormEvent } from "react"
import { AnimatePresence, motion } from "motion/react"
import { Bookmark, Check, Heart, Link2, MessageCircle, Repeat2, Send, Share2, UserCheck, UserPlus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { SlotNumber } from "./slot-number"
import { useDemoState, useHover } from "./demo-state"

const colors = ["var(--primary)", "#f43f5e", "#f59e0b", "#38bdf8", "#a78bfa"]

function Burst() {
  return (
    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <motion.span
        className="absolute size-8 rounded-full border-2 border-rose-500"
        initial={{ scale: 0.2, opacity: 1 }}
        animate={{ scale: 1.8, opacity: 0 }}
        transition={{ duration: 0.5 }}
      />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2
        const r = 26 + (i % 2) * 8
        return (
          <motion.span
            key={i}
            className="absolute size-1.5 rounded-full"
            style={{ backgroundColor: colors[i % colors.length] }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: Math.cos(a) * r, y: Math.sin(a) * r, scale: 0, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        )
      })}
    </span>
  )
}

const ACTION = "h-8 gap-1.5 px-2 text-muted-foreground"

/**
 * Social post on a shadcn Card with a full action bar of shadcn Buttons:
 * follow, like (particle burst), comment (inline composer), repost, bookmark, share (copy link).
 * Hover: the heart beats and blushes. Disabled: every action disabled.
 */
export function ReactionButton() {
  const { disabled } = useDemoState()
  const { hovered, hoverProps } = useHover()

  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(128)
  const [burst, setBurst] = useState(0)
  const [following, setFollowing] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [reposts, setReposts] = useState(12)
  const [saved, setSaved] = useState(false)
  const [composer, setComposer] = useState(false)
  const [draft, setDraft] = useState("")
  const [replies, setReplies] = useState<string[]>([])
  const [shareOpen, setShareOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const like = () => {
    setLiked((l) => !l)
    setLikes((c) => c + (liked ? -1 : 1))
    if (!liked) setBurst((b) => b + 1)
  }
  const repost = () => {
    setReposted((r) => !r)
    setReposts((c) => c + (reposted ? -1 : 1))
  }
  const reply = (e: FormEvent) => {
    e.preventDefault()
    if (!draft.trim()) return
    setReplies((r) => [...r, draft.trim()])
    setDraft("")
  }
  const copy = () => {
    try {
      navigator.clipboard?.writeText("https://motioncn.dev/p/spring-physics").catch(() => {})
    } catch {
      /* clipboard may be unavailable in a sandbox */
    }
    setCopied(true)
    setTimeout(() => (setCopied(false), setShareOpen(false)), 1400)
  }

  return (
    <Card className="w-[340px] gap-4 py-5">
      <div className="flex items-center gap-3 px-5">
        <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-full text-sm font-semibold">EK</div>
        <div className="flex-1">
          <p className="text-sm font-semibold">Eleni K.</p>
          <p className="text-muted-foreground text-xs">2 min ago</p>
        </div>
        <Button asChild size="sm" variant={following ? "secondary" : "default"} className="h-7 overflow-hidden rounded-full px-3 text-xs">
          <motion.button layout disabled={disabled} onClick={() => setFollowing((f) => !f)} style={{ borderRadius: 999 }} transition={{ type: "spring", bounce: 0.3, duration: 0.4 }}>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={String(following)} className="flex items-center gap-1" initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -12, opacity: 0 }}>
                {following ? <UserCheck className="size-3.5" /> : <UserPlus className="size-3.5" />}
                {following ? "Following" : "Follow"}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </Button>
      </div>

      <p className="px-5 text-sm">Just shipped spring physics for every shadcn component on the canvas. Go play with the mood slider.</p>

      <div className="flex items-center gap-0.5 border-t px-3 pt-3">
        <Button variant="ghost" size="sm" onClick={like} aria-pressed={liked} aria-label="Like" className={cn(ACTION, "relative", liked && "text-rose-500")} data-hover-target disabled={disabled} {...hoverProps}>
          <span className="relative flex">
            <motion.span key={`h${burst}${liked}`} initial={liked ? { scale: 0.4 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }} className="flex">
              <motion.span className="flex" animate={hovered ? { scale: [1, 1.25, 1, 1.15, 1] } : { scale: 1 }} transition={{ duration: 1, repeat: hovered ? Infinity : 0 }}>
                <Heart className={cn("transition-colors", (liked || hovered) && "text-rose-500", liked && "fill-rose-500")} />
              </motion.span>
            </motion.span>
            <AnimatePresence>{liked && burst > 0 && <Burst key={burst} />}</AnimatePresence>
          </span>
          <SlotNumber value={String(likes)} className="text-sm" />
        </Button>

        <Button variant="ghost" size="sm" aria-label="Comment" aria-expanded={composer} className={cn(ACTION, composer && "text-primary")} disabled={disabled} onClick={() => setComposer((c) => !c)}>
          <motion.span className="flex" animate={{ rotate: composer ? -12 : 0, scale: composer ? 1.15 : 1 }}>
            <MessageCircle className={cn(composer && "fill-primary/15")} />
          </motion.span>
          <SlotNumber value={String(24 + replies.length)} className="text-sm" />
        </Button>

        <Button variant="ghost" size="sm" aria-label="Repost" aria-pressed={reposted} className={cn(ACTION, reposted && "text-emerald-600")} disabled={disabled} onClick={repost}>
          <motion.span className="flex" animate={{ rotate: reposted ? 180 : 0 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}>
            <Repeat2 />
          </motion.span>
          <SlotNumber value={String(reposts)} className="text-sm" />
        </Button>

        <div className="ml-auto flex items-center">
          <Button variant="ghost" size="icon" aria-label="Save" aria-pressed={saved} className={cn("size-8", saved ? "text-primary" : "text-muted-foreground")} disabled={disabled} onClick={() => setSaved((v) => !v)}>
            <motion.span key={String(saved)} className="flex" initial={saved ? { y: -8, scale: 0.6 } : false} animate={{ y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 14 }}>
              <Bookmark className={cn(saved && "fill-primary")} />
            </motion.span>
          </Button>

          <div className="relative">
            <Button variant="ghost" size="icon" aria-label="Share" aria-expanded={shareOpen} className="text-muted-foreground size-8" disabled={disabled} onClick={() => setShareOpen((o) => !o)}>
              <motion.span className="flex" animate={{ rotate: shareOpen ? 20 : 0 }}>
                <Share2 />
              </motion.span>
            </Button>
            <AnimatePresence>
              {shareOpen && !disabled && (
                <motion.div
                  className="bg-popover text-popover-foreground absolute right-0 bottom-full z-20 mb-2 w-44 origin-bottom-right rounded-lg border p-1 shadow-lg"
                  initial={{ opacity: 0, scale: 0.85, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 4 }}
                  transition={{ type: "spring", bounce: 0.3, duration: 0.3 }}
                >
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={copy}>
                    <AnimatePresence mode="popLayout" initial={false}>
                      <motion.span key={String(copied)} className="flex items-center gap-2" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
                        {copied ? <Check className="text-emerald-600" /> : <Link2 />}
                        {copied ? "Link copied" : "Copy link"}
                      </motion.span>
                    </AnimatePresence>
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => (setComposer(true), setShareOpen(false))}>
                    <Send /> Send as reply
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {composer && !disabled && (
          <motion.div
            className="overflow-hidden px-5"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
          >
            <ul className="space-y-1.5 pb-2">
              <AnimatePresence initial={false}>
                {replies.map((r, i) => (
                  <motion.li key={i} className="bg-muted rounded-lg px-3 py-1.5 text-xs" initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
                    <span className="font-semibold">You</span> {r}
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
            <form onSubmit={reply} className="flex gap-2">
              <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Write a reply…" className="h-8" autoFocus />
              <Button type="submit" size="icon" className="size-8 shrink-0" disabled={!draft.trim()} aria-label="Send reply">
                <motion.span className="flex" whileTap={{ x: 6, y: -6 }}>
                  <Send />
                </motion.span>
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
