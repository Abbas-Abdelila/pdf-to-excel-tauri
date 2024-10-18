import { useState } from 'react';
import UploadFile from './components/UploadFile';
import Extract from './components/Extract';
import NavBar from './components/NavBar';


export default function Home() {
  const [fileName, setFileName] = useState<string>('');
  const [fileOpen, setFileOpen] = useState<boolean>(false);
  const [totalPages, setTotalPages] = useState<number>(0);

  return (
    <div>
      <NavBar />
      <UploadFile setFileName={setFileName} setFileOpen={setFileOpen} setTotalPages={setTotalPages}/>
      {
        fileName && <Extract fileName={fileName} fileOpen={fileOpen} totalPages={totalPages} />
      }
    </div>
  )
}