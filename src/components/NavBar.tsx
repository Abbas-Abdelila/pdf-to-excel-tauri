import { ReloadIcon } from "@radix-ui/react-icons";

export default function NavBar() {
  const reloadPage = () => {
    window.location.reload();
  };

  return (
    <div className="flex flex-1 bg-white border-b py-2 border-slate-200 items-center justify-between mb-20 fixed top-0 right-0 left-0 px-10 md:px-20 z-50 md:mb-10">
      <h1 className="text-md">Hi <span className="text-blue-600 font-semibold">Piotr!</span></h1>
      <ReloadIcon className="text-blue-600 hover:animate-pulse h-8 w-8 cursor-pointer" onClick={reloadPage} />
      <img src="/piotr.jpg" alt="logo" width={60} height={60} className="rounded-full" />
    </div>
  )
}