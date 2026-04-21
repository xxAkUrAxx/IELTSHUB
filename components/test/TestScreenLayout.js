export default function TestScreenLayout({
  left,
  right,
  leftClassName = "w-[60%] h-full bg-white text-black p-6 overflow-y-auto",
  rightClassName = "w-[40%] h-full bg-white text-black p-6 overflow-y-auto border-l border-gray-300",
}) {
  return (
    <div className="fixed inset-0 flex bg-gray-800">
      <section className={leftClassName}>{left}</section>
      <section className={rightClassName}>{right}</section>
    </div>
  );
}
