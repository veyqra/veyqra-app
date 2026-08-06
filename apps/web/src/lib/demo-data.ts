import {
  Activity,
  Boxes,
  Cpu,
  HardDrive,
  Images,
  Server,
} from "lucide-react";

export const dashboardStats = [
  {
    title: "Backend",
    value: "Online",
    subtitle: "FastAPI",
    icon: Server,
  },
  {
    title: "GPU",
    value: "Offline",
    subtitle: "No Local GPU",
    icon: Cpu,
  },
  {
    title: "Queue",
    value: "0",
    subtitle: "Running Jobs",
    icon: Activity,
  },
  {
    title: "Images",
    value: "0",
    subtitle: "Generated",
    icon: Images,
  },
  {
    title: "Models",
    value: "0",
    subtitle: "Installed",
    icon: Boxes,
  },
  {
    title: "Storage",
    value: "--",
    subtitle: "Disk Usage",
    icon: HardDrive,
  },
];

export const recentJobs = [
  {
    id: 1,
    title: "Flux Portrait",
    status: "Completed",
    completed: true,
    time: "Just now",
  },
  {
    id: 2,
    title: "Anime XL",
    status: "Completed",
    completed: true,
    time: "5 min ago",
  },
  {
    id: 3,
    title: "LoRA Training",
    status: "Waiting",
    completed: false,
    time: "Queued",
  },
];

export const systemStatus = [
  {
    id: 1,
    name: "ComfyUI",
    online: true,
  },
  {
    id: 2,
    name: "FastAPI",
    online: true,
  },
  {
    id: 3,
    name: "My AWS",
    online: false,
  },
  {
    id: 4,
    name: "GPU Worker",
    online: false,
  },
];
