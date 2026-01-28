import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function FileUploadButton({ onFilesSelected, disabled }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls = [];

      for (const file of files) {
        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`File ${file.name} exceeds 10MB limit`);
          continue;
        }

        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        uploadedUrls.push(file_url);
      }

      if (uploadedUrls.length > 0) {
        onFilesSelected(uploadedUrls);
        toast.success(`${uploadedUrls.length} file(s) uploaded`);
      }
    } catch (error) {
      toast.error("Failed to upload file");
      console.error(error);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
      />
      <Button
        type="button"
        size="icon"
        disabled={disabled || uploading}
        onClick={() => fileInputRef.current?.click()}
        className="bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white shrink-0"
        title="Attach files"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Paperclip className="w-4 h-4" />
        )}
      </Button>
    </>
  );
}