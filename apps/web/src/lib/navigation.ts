import {
  BrainCircuit,
  Boxes,
  Cloud,
  History,
  ImagePlus,
  LayoutDashboard,
  Settings,
  Store,
} from "lucide-react";

export const navigation = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Generate",
    href: "/generate",
    icon: ImagePlus,
  },
  {
    title: "Train",
    href: "/train",
    icon: BrainCircuit,
    disabled: true,
  },
  {
    title: "Models",
    href: "/models",
    icon: Boxes,
  },
  {
    title: "History",
    href: "/history",
    icon: History,
  },
  {
    title: "Cloud",
    href: "/cloud",
    icon: Cloud,
    disabled: true,
  },
  {
    title: "Marketplace",
    href: "/marketplace",
    icon: Store,
    disabled: true,
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    disabled: true,
  },
];
