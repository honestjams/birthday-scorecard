/**
 * Shown instantly on every tab switch while the server renders the page.
 * Turns a "did my tap work?" pause into visible, immediate feedback.
 */
export default function Loading() {
  return (
    <div aria-hidden className="animate-rise">
      <div className="skeleton h-32 w-full rounded-none" />
      <div className="space-y-3 p-5">
        <div className="skeleton h-12 w-full" />
        <div className="skeleton h-20 w-full" />
        <div className="skeleton h-20 w-full" />
        <div className="skeleton h-20 w-2/3" />
      </div>
    </div>
  );
}
