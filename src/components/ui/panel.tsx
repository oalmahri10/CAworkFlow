import clsx from "clsx";

export function Panel({
  title,
  action,
  children,
  className,
  dark = false,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  dark?: boolean;
}) {
  return (
    <section
      className={clsx(
        "card-elevation rounded-[var(--radius-card)] p-5",
        dark ? "bg-[color:var(--color-dark-surface-2)] text-white" : "bg-white",
        className
      )}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && (
            <h2 className={clsx("text-sm font-bold", dark ? "text-white" : "text-charcoal")}>{title}</h2>
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
