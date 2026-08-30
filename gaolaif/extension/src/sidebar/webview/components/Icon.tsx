import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Bug,
  MessageSquare,
  Swords,
  Bomb,
  Brain,
  StickyNote,
  ListChecks,
  MonitorPlay,
  Settings,
  Shield,
  Wifi,
  WifiOff,
  Search,
  Inbox,
  Check,
  X,
  Copy,
  FileText,
  Zap,
  Loader2,
  AlertTriangle,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Plus,
  Trash2,
  Edit3,
  Eye,
  EyeOff,
  Download,
  Upload,
  RefreshCw,
  Play,
  Square,
  Terminal,
  Code2,
  BookOpen,
  TrendingUp,
  Target,
  Network,
  AlertCircle,
  CheckCircle2,
  Info,
  Lock,
  Unlock,
  Globe,
  Database,
  Fingerprint,
  Scan,
  FileSearch,
  Lightbulb,
  Combine,
  ArrowUpRight,
  ArrowDownRight,
  Gauge,
  Layers,
  History,
} from 'lucide-react';

export type IconName =
  | 'overview'
  | 'findings'
  | 'chat'
  | 'attackWorkspace'
  | 'exploits'
  | 'notes'
  | 'tasks'
  | 'settings'
  | 'brand'
  | 'connected'
  | 'disconnected'
  | 'search'
  | 'inbox'
  | 'check'
  | 'x'
  | 'copy'
  | 'copied'
  | 'fileText'
  | 'zap'
  | 'loading'
  | 'warning'
  | 'externalLink'
  | 'chevronRight'
  | 'chevronDown'
  | 'chevronUp'
  | 'more'
  | 'plus'
  | 'trash'
  | 'edit'
  | 'eye'
  | 'eyeOff'
  | 'download'
  | 'upload'
  | 'refresh'
  | 'play'
  | 'stop'
  | 'terminal'
  | 'code'
  | 'book'
  | 'trendingUp'
  | 'target'
  | 'network'
  | 'alertCircle'
  | 'checkCircle'
  | 'info'
  | 'lock'
  | 'unlock'
  | 'globe'
  | 'database'
  | 'fingerprint'
  | 'scan'
  | 'fileSearch'
  | 'lightbulb'
  | 'combine'
  | 'arrowUpRight'
  | 'arrowDownRight'
  | 'gauge'
  | 'layers'
  | 'history';

const iconMap: Record<IconName, LucideIcon> = {
  overview: LayoutDashboard,
  findings: Bug,
  chat: MessageSquare,
  attackWorkspace: Swords,
  exploits: Bomb,
  notes: StickyNote,
  tasks: ListChecks,
  settings: Settings,
  brand: Shield,
  connected: Wifi,
  disconnected: WifiOff,
  search: Search,
  inbox: Inbox,
  check: Check,
  x: X,
  copy: Copy,
  copied: CheckCircle2,
  fileText: FileText,
  zap: Zap,
  loading: Loader2,
  warning: AlertTriangle,
  externalLink: ExternalLink,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  more: MoreHorizontal,
  plus: Plus,
  trash: Trash2,
  edit: Edit3,
  eye: Eye,
  eyeOff: EyeOff,
  download: Download,
  upload: Upload,
  refresh: RefreshCw,
  play: Play,
  stop: Square,
  terminal: Terminal,
  code: Code2,
  book: BookOpen,
  trendingUp: TrendingUp,
  target: Target,
  network: Network,
  alertCircle: AlertCircle,
  checkCircle: CheckCircle2,
  info: Info,
  lock: Lock,
  unlock: Unlock,
  globe: Globe,
  database: Database,
  fingerprint: Fingerprint,
  scan: Scan,
  fileSearch: FileSearch,
  lightbulb: Lightbulb,
  combine: Combine,
  arrowUpRight: ArrowUpRight,
  arrowDownRight: ArrowDownRight,
  gauge: Gauge,
  layers: Layers,
  history: History,
};

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  className?: string;
  style?: React.CSSProperties;
  'aria-hidden'?: boolean;
}

export function Icon({
  name,
  size = 16,
  color = 'currentColor',
  strokeWidth = 2,
  className,
  style,
  ...props
}: IconProps) {
  const LucideIconComponent = iconMap[name];
  if (!LucideIconComponent) return null;
  return (
    <LucideIconComponent
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      style={style}
      aria-hidden={props['aria-hidden'] ?? true}
    />
  );
}
