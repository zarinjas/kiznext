import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Luggage,
  LifeBuoy,
  Package,
  EyeOff,
  MapPin,
  User,
  ChevronRight,
  LogOut,
} from "lucide-react"
import { SignOutButton } from "@/components/shared/sign-out-button"

const menuItems = [
  {
    label: "Guest House",
    description: "Book accommodation for guests",
    href: "rumah-tamu",
    icon: Luggage,
  },
  {
    label: "Helpdesk",
    description: "Contact KIZ management",
    href: "helpdesk",
    icon: LifeBuoy,
  },
  {
    label: "My Parcels",
    description: "Check your parcel status",
    href: "parcel",
    icon: Package,
  },
  {
    label: "Lost & Found",
    description: "Report or check lost items",
    href: "hilang",
    icon: EyeOff,
  },
  {
    label: "Block Directory",
    description: "Guide to block & facility locations",
    href: "direktori",
    icon: MapPin,
  },
  {
    label: "My Profile",
    description: "Update personal info",
    href: "profile",
    icon: User,
  },
]

export default async function LagiPage({
  params,
}: {
  params: Promise<{ role: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const { role } = await params

  return (
    <div className="px-4 py-5">
      <h1 className="font-heading text-xl text-primary-foreground">More</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        All other KIZ Super App features.
      </p>

      <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
        {menuItems.map((item, i) => {
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={`/${role}/${item.href}`}
              className={`flex items-center gap-3 px-4 py-3.5 active:bg-muted ${
                i !== menuItems.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <span className="flex-1">
                <span className="block text-sm font-medium text-foreground">
                  {item.label}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {item.description}
                </span>
              </span>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          )
        })}
      </div>

      <div className="mt-5">
        <SignOutButton className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-sm font-medium text-destructive active:bg-destructive/10">
          <LogOut className="size-4" />
          Log Out
        </SignOutButton>
      </div>
    </div>
  )
}
