import PdfUpload from "../components/PdfUpload";

export default function page() {
  return (
      <main className="min-h-screen bg-gradient-to-b from-slate-800 to-slate-400 text-white md:p-22 pt-22 w-full">
        <PdfUpload/>
      </main>
  );
}