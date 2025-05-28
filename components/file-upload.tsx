"use client"

import { useState, useRef } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Progress } from "@/components/ui/progress"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Upload, X, File, ImageIcon, FileText, Film } from "lucide-react"

export function FileUpload({
  onUploadComplete = () => {},
  allowedTypes = ["image/*", "application/pdf", "text/plain"],
  maxSizeMB = 10,
  vehicleId = null,
  description = "",
  tags = [],
}) {
  const [file, setFile] = useState(null)
  const [filePreview, setFilePreview] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [fileDescription, setFileDescription] = useState(description)
  const [fileTags, setFileTags] = useState(tags.join(", "))
  const fileInputRef = useRef(null)

  // Convex mutations
  const generateUploadUrl = useMutation(api.files.generateUploadUrl)
  const saveFile = useMutation(api.files.saveFile)

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    // Check file size
    if (selectedFile.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `Maximum file size is ${maxSizeMB}MB`,
        variant: "destructive",
      })
      return
    }

    // Check file type
    const fileType = selectedFile.type
    const isAllowedType = allowedTypes.some((type) => {
      if (type.endsWith("/*")) {
        const generalType = type.split("/")[0]
        return fileType.startsWith(`${generalType}/`)
      }
      return type === fileType
    })

    if (!isAllowedType) {
      toast({
        title: "File type not allowed",
        description: `Allowed file types: ${allowedTypes.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    setFile(selectedFile)

    // Generate preview for images
    if (fileType.startsWith("image/")) {
      const reader = new FileReader()
      reader.onload = (e) => {
        setFilePreview(e.target.result)
      }
      reader.readAsDataURL(selectedFile)
    } else {
      setFilePreview(null)
    }
  }

  // Clear selected file
  const clearFile = () => {
    setFile(null)
    setFilePreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  // Upload file
  const uploadFile = async () => {
    if (!file) return

    setIsUploading(true)
    setUploadProgress(0)

    try {
      // Step 1: Get upload URL from Convex
      const fileType = getFileType(file.type)
      const { uploadUrl } = await generateUploadUrl({
        fileName: file.name,
        fileType,
        contentType: file.type,
      })

      // Step 2: Upload file to storage
      const xhr = new XMLHttpRequest()
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadProgress(progress)
        }
      })

      await new Promise((resolve, reject) => {
        xhr.open("PUT", uploadUrl, true)
        xhr.setRequestHeader("Content-Type", file.type)

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.response)
          } else {
            reject(new Error(`HTTP Error: ${xhr.status}`))
          }
        }

        xhr.onerror = () => reject(new Error("Network Error"))
        xhr.send(file)
      })

      // Step 3: Save file metadata in Convex
      const storageId = new URL(uploadUrl).pathname.split("/").pop()
      const fileId = await saveFile({
        storageId,
        fileName: file.name,
        fileType,
        contentType: file.type,
        fileSize: file.size,
        description: fileDescription,
        tags: fileTags
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag),
        vehicleId: vehicleId || undefined,
      })

      toast({
        title: "File uploaded successfully",
        description: "Your file has been uploaded and saved.",
      })

      // Notify parent component
      onUploadComplete({
        fileId,
        fileName: file.name,
        fileType,
        contentType: file.type,
        fileSize: file.size,
      })

      // Clear form
      clearFile()
      setFileDescription("")
      setFileTags("")
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Upload failed",
        description: error.message || "An error occurred while uploading the file.",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  // Get file type icon
  const getFileIcon = (fileType) => {
    if (!fileType) return <File className="h-6 w-6" />

    if (fileType.startsWith("image/")) {
      return <ImageIcon className="h-6 w-6" />
    } else if (fileType.startsWith("video/")) {
      return <Film className="h-6 w-6" />
    } else if (fileType === "application/pdf" || fileType.startsWith("text/")) {
      return <FileText className="h-6 w-6" />
    }

    return <File className="h-6 w-6" />
  }

  // Get file type category
  const getFileType = (mimeType) => {
    if (mimeType.startsWith("image/")) {
      return "image"
    } else if (mimeType.startsWith("video/")) {
      return "video"
    } else if (mimeType === "application/pdf") {
      return "document"
    } else if (mimeType.startsWith("text/")) {
      return "document"
    }

    return "document"
  }

  return (
    <div>
      <div className="mb-4">
        <Label htmlFor="file-upload">Upload File</Label>
        <div className="mt-1">
          <Input
            id="file-upload"
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={allowedTypes.join(",")}
            disabled={isUploading}
            className="hidden"
          />

          {!file ? (
            <div
              className="flex cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-input bg-muted/50 p-8 text-center hover:bg-muted"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
              <div className="text-sm font-medium">Click to upload or drag and drop</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {allowedTypes.join(", ")} (Max: {maxSizeMB}MB)
              </div>
            </div>
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {filePreview ? (
                      <img
                        src={filePreview || "/placeholder.svg"}
                        alt="Preview"
                        className="h-12 w-12 rounded-md object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-muted">
                        {getFileIcon(file.type)}
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{file.name}</div>
                      <div className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={clearFile} disabled={isUploading}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {isUploading && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} className="mt-1" />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <div className="mb-4">
        <Label htmlFor="file-description">Description (optional)</Label>
        <Textarea
          id="file-description"
          placeholder="Enter a description for this file"
          value={fileDescription}
          onChange={(e) => setFileDescription(e.target.value)}
          disabled={isUploading || !file}
          className="mt-1"
        />
      </div>

      <div className="mb-6">
        <Label htmlFor="file-tags">Tags (optional, comma separated)</Label>
        <Input
          id="file-tags"
          placeholder="e.g. invoice, receipt, damage"
          value={fileTags}
          onChange={(e) => setFileTags(e.target.value)}
          disabled={isUploading || !file}
          className="mt-1"
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={uploadFile} disabled={!file || isUploading}>
          {isUploading ? (
            <>
              <LoadingSpinner className="mr-2" size="sm" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Upload File
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
