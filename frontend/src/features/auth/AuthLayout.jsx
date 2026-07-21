export function AuthLayout({ children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf9f5] px-4 py-8">
      <div className="w-full max-w-[420px] bg-[#efe9de] border border-[#e6dfd8] rounded-[12px] p-6 md:p-8 flex flex-col">
        <div className="w-full">
          {children}
        </div>
        {footer && (
          <div className="mt-6 pt-6 border-t border-[#e6dfd8] w-full">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
