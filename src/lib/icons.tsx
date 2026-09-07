/**
 * Site icons — Hugeicons Pro Rounded/Solid (filled).
 * Icon path data is generated from the Pro SVG pack via scripts/generate-solid-icons.py
 */
"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import type { IconSvgElement } from "@hugeicons/react";
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ArchiveIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  BellIcon,
  BoldIcon,
  BrushIcon,
  CallIcon,
  CameraIcon,
  CarIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  CloudIcon,
  CopyIcon,
  CrownIcon,
  EditIcon,
  EraserIcon,
  FileTextIcon,
  FolderIcon,
  FolderInputIcon,
  ForwardIcon,
  GlobeIcon,
  GridIcon,
  HardDriveIcon,
  HelpCircleIcon,
  HighlighterIcon,
  HomeIcon,
  IdCardIcon,
  ImageIconIcon,
  InboxIcon,
  InfoIcon,
  ItalicIcon,
  KeyRoundIcon,
  LanguagesIcon,
  LayoutGridIcon,
  Link2Icon,
  ListIcon,
  ListOrderedIcon,
  Loader2Icon,
  LockIcon,
  LoginIcon,
  LogOutIcon,
  MailIcon,
  MailOpenIcon,
  MapPinIcon,
  Maximize2Icon,
  MenuIcon,
  MessageIcon,
  Minimize2Icon,
  MoreHorizontalCircleIcon,
  MoreHorizontalIcon,
  PaperclipAltIcon,
  PaperclipIcon,
  PassportIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  QrCodeIcon,
  QuoteIcon,
  Redo2Icon,
  RefreshCwIcon,
  ReloadIcon,
  ReplyIcon,
  SaveIcon,
  SearchIcon,
  SendIcon,
  SentIcon,
  SettingsIcon,
  ShareIcon,
  ShieldAlertIcon,
  ShieldIcon,
  SmileIcon,
  SparklesIcon,
  StarIcon,
  StrikethroughIcon,
  SupportIcon,
  TagIcon,
  Trash2Icon,
  UnderlineIcon,
  Undo2Icon,
  UnlinkIcon,
  UserIcon,
  UserMultipleIcon,
  UsersIcon,
  Wand2Icon,
  XIcon,
} from "@/lib/generated/solid-icons";
import { cn } from "@/lib/utils";

type IconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
  color?: string;
  absoluteStrokeWidth?: boolean;
};

function makeIcon(icon: IconSvgElement) {
  function Icon({
    size = 24,
    className,
    color = "currentColor",
  }: IconProps) {
    return (
      <HugeiconsIcon
        icon={icon}
        size={size}
        color={color}
        className={cn("shrink-0", className)}
      />
    );
  }
  Icon.displayName = "HiSolidIcon";
  return Icon;
}

export const Search = makeIcon(SearchIcon);
export const Menu = makeIcon(MenuIcon);
export const ArrowRight = makeIcon(ArrowRightIcon);
export const ArrowUp = makeIcon(ArrowUpIcon);
export const ArrowDown = makeIcon(ArrowDownIcon);
export const ChevronUp = makeIcon(ArrowUpIcon);
export const ChevronDown = makeIcon(ArrowDownIcon);
export const Check = makeIcon(CheckIcon);
export const CheckCircle = makeIcon(CheckCircleIcon);
export const X = makeIcon(XIcon);
export const Plus = makeIcon(PlusIcon);
export const Pencil = makeIcon(PencilIcon);
export const Edit = makeIcon(EditIcon);
export const Camera = makeIcon(CameraIcon);
export const Crown = makeIcon(CrownIcon);
export const HardDrive = makeIcon(HardDriveIcon);
export const IdCard = makeIcon(IdCardIcon);
export const Mail = makeIcon(MailIcon);
export const MailOpen = makeIcon(MailOpenIcon);
export const Inbox = makeIcon(InboxIcon);
export const Sent = makeIcon(SentIcon);
export const Forward = makeIcon(ForwardIcon);
export const Reply = makeIcon(ReplyIcon);
export const Send = makeIcon(SendIcon);
export const Trash2 = makeIcon(Trash2Icon);
export const Archive = makeIcon(ArchiveIcon);
export const FolderInput = makeIcon(FolderInputIcon);
export const Folder = makeIcon(FolderIcon);
export const Paperclip = makeIcon(PaperclipIcon);
export const PaperclipAlt = makeIcon(PaperclipAltIcon);
export const Tag = makeIcon(TagIcon);
export const Clock = makeIcon(ClockIcon);
export const Cloud = makeIcon(CloudIcon);
export const RefreshCw = makeIcon(RefreshCwIcon);
export const Reload = makeIcon(ReloadIcon);
export const Settings = makeIcon(SettingsIcon);
export const ShieldAlert = makeIcon(ShieldAlertIcon);
export const Shield = makeIcon(ShieldIcon);
export const Sparkles = makeIcon(SparklesIcon);
export const Users = makeIcon(UsersIcon);
export const UserMultiple = makeIcon(UserMultipleIcon);
export const LayoutGrid = makeIcon(LayoutGridIcon);
export const Grid = makeIcon(GridIcon);
export const LogOut = makeIcon(LogOutIcon);
export const MoreHorizontal = makeIcon(MoreHorizontalIcon);
export const MoreHorizontalCircle = makeIcon(MoreHorizontalCircleIcon);
export const QrCode = makeIcon(QrCodeIcon);
export const Loader2 = makeIcon(Loader2Icon);
export const Globe = makeIcon(GlobeIcon);
export const Info = makeIcon(InfoIcon);
export const Save = makeIcon(SaveIcon);
export const Login = makeIcon(LoginIcon);
export const Copy = makeIcon(CopyIcon);
export const Share = makeIcon(ShareIcon);
export const Message = makeIcon(MessageIcon);
export const Bell = makeIcon(BellIcon);
export const FileText = makeIcon(FileTextIcon);
export const ImageIcon = makeIcon(ImageIconIcon);
export const Link2 = makeIcon(Link2Icon);
export const Unlink = makeIcon(UnlinkIcon);
export const Bold = makeIcon(BoldIcon);
export const Italic = makeIcon(ItalicIcon);
export const Underline = makeIcon(UnderlineIcon);
export const Strikethrough = makeIcon(StrikethroughIcon);
export const AlignLeft = makeIcon(AlignLeftIcon);
export const AlignCenter = makeIcon(AlignCenterIcon);
export const AlignRight = makeIcon(AlignRightIcon);
export const List = makeIcon(ListIcon);
export const ListOrdered = makeIcon(ListOrderedIcon);
export const Quote = makeIcon(QuoteIcon);
export const Smile = makeIcon(SmileIcon);
export const Eraser = makeIcon(EraserIcon);
export const Highlighter = makeIcon(HighlighterIcon);
export const Brush = makeIcon(BrushIcon);
export const Undo2 = makeIcon(Undo2Icon);
export const Redo2 = makeIcon(Redo2Icon);
export const Maximize2 = makeIcon(Maximize2Icon);
export const Minimize2 = makeIcon(Minimize2Icon);
export const Wand2 = makeIcon(Wand2Icon);
export const Languages = makeIcon(LanguagesIcon);
export const Home = makeIcon(HomeIcon);
export const Phone = makeIcon(PhoneIcon);
export const Call = makeIcon(CallIcon);
export const MapPin = makeIcon(MapPinIcon);
export const User = makeIcon(UserIcon);
export const Lock = makeIcon(LockIcon);
export const KeyRound = makeIcon(KeyRoundIcon);
export const HelpCircle = makeIcon(HelpCircleIcon);
export const Passport = makeIcon(PassportIcon);
export const Car = makeIcon(CarIcon);
export const Star = makeIcon(StarIcon);
export const Support = makeIcon(SupportIcon);

export type { IconSvgElement, IconProps };
