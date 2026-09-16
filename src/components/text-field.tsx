"use client";

import { cn } from "@/lib/utils";
import {
  type InputHTMLAttributes,
  type ReactNode,
  useId,
  useState,
} from "react";

type TextFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size" | "value" | "onChange" | "placeholder" | "className"
> & {
  label: string;
  value: string;
  onChange: (value: string) => void;
  size?: "lg" | "md";
  className?: string;
  inputClassName?: string;
  endAdornment?: ReactNode;
};

export function TextField({
  label,
  value,
  onChange,
  size = "lg",
  className,
  inputClassName,
  endAdornment,
  type = "text",
  onFocus,
  onBlur,
  id: idProp,
  ...rest
}: TextFieldProps) {
  const uid = useId();
  const id = idProp ?? uid;
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;

  return (
    <div className={cn("relative", className)}>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        placeholder=" "
        aria-label={label}
        className={cn(
          "w-full bg-transparent border hover:border-white/10 border-white/5 border-2 text-white outline-none transition-[border-color,padding] font-[family-name:var(--font-manrope)]",
          "focus:border-[#0066ff]",
          size === "lg"
            ? "h-[56px] md:h-[58px] rounded-[16px] px-4 md:px-5 text-[16px] md:text-[17px]"
            : "h-14 rounded-[16px] px-4 text-[15px]",
          floated ? "pt-[1.15rem] pb-1.5" : "",
          endAdornment && (size === "lg" ? "pr-24" : "pr-20"),
          inputClassName,
        )}
        {...rest}
      />
      <label
        htmlFor={id}
        className={cn(
          "pointer-events-none absolute font-[family-name:var(--font-manrope)] text-white/35 transition-all duration-200 ease-out",
          size === "lg" ? "left-4 md:left-5" : "left-4",
          floated
            ? "top-[0.45rem] text-[11px] md:text-[12px]"
            : cn(
                "top-1/2 -translate-y-1/2",
                size === "lg" ? "text-[16px] md:text-[17px]" : "text-[15px]",
              ),
        )}
      >
        {label}
      </label>
      {endAdornment ? (
        <div
          className={cn(
            "absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center",
            size === "lg" ? "right-4" : "right-3.5",
          )}
        >
          {endAdornment}
        </div>
      ) : null}
    </div>
  );
}
