"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LoadingSpinner } from "@/components/loading-spinner"
import { FileUpload } from "@/components/file-upload"
import { Search, ImageIcon, FileText, Film, File, Download, Trash2, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function FileGallery({
  userId = null,
  vehicleId = null,
  showUpload = true,
  showFilters = true,
  limit = 20,
  onFileSelect = null,
  className = "",
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const [fileType, setFileType] = useState("")
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Get files
  const filesResult = useQuery(api.files.getUserFiles, {
    userId: userId || undefined,
    fileType: fileType || undefined,
    vehicleId: vehicleId || undefined,
    limit,
  })

  // Filter files based on search query
  const filteredFiles = filesResult?.files?.filter((file) => {
    if (!searchQuery) return true

    const query = searchQuery.toLowerCase()
    return (
      file.fileName.toLowerCase().includes(query) ||
      (file.description && file.description.toLowerCase().includes(query)) ||
      file.tags.some((tag) => tag.toLowerCase().includes(query))
    )
  })

  // Handle file upload complete
  const handleUploadComplete = (fileData) => {
    setIsUploadDialogOpen(false)
  }

  // Handle file selection
  const handleFileClick = (file) => {
    if (onFileSelect) {
      onFileSelect(file)
    } else {
      setSelectedFile(file)
      setIsPreviewOpen(true)
    }
  }

  // Get file icon
  const getFileIcon = (fileType) => {
    if (fileType === "image") {
      return <ImageIcon className="h-5 w-5" />
    } else if (fileType === "video") {
      return <Film className="h-5 w-5" />
    } else if (fileType === "document") {
      return <FileText className="h-5 w-5" />
    }

    return <File className="h-5 w-5" />
  }

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes < 1024) {
      return `${bytes} B`
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    } else {
      return `${(bytes / 1024 / 1024).toFixed(1)} MB`
    }
  }

  // Get file extension
  const getFileExtension = (fileName) => {
    return fileName.split(".").pop().toUpperCase()
  }

  return (
    <div className={className}>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {showFilters && (
            <Select value={fileType} onValueChange={setFileType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All file types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All file types</SelectItem>
                <SelectItem value="image">Images</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {showUpload && (
          <Button className="ml-4" onClick={() => setIsUploadDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Upload
          </Button>
        )}
      </div>

      {!filesResult ? (
        <div className="flex h-40 items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : filesResult.files.length === 0 ? (
        <div className="flex h-40 flex-col items-center justify-center rounded-lg border border-dashed">
          <File className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">No files found</p>
          {showUpload && (
            <Button variant="link" onClick={() => setIsUploadDialogOpen(true)}>
              Upload a file
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredFiles.map((file) => (
            <Card
              key={file._id}
              className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
              onClick={() => handleFileClick(file)}
            >
              <CardContent className="p-0">
                {file.fileType === "image" ? (
                  <div className="aspect-square w-full overflow-hidden bg-muted">
                    <img
                      src={file.url || "/placeholder.svg"}
                      alt={file.fileName}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex aspect-square w-full flex-col items-center justify-center bg-muted p-4">
                    {getFileIcon(file.fileType)}
                    <span className="mt-2 text-lg font-bold">{getFileExtension(file.fileName)}</span>
                  </div>
                )}

                <div className="p-3">
                  <div className="mb-1 truncate font-medium">{file.fileName}</div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">{formatFileSize(file.fileSize)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(file.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>

                  {file.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {file.tags.slice(0, 3).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {file.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{file.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Upload a file to your account. Supported file types: images, PDFs, and text files.
            </DialogDescription>
          </DialogHeader>

          <FileUpload onUploadComplete={handleUploadComplete} vehicleId={vehicleId} />
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[800px]">
          {selectedFile && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedFile.fileName}</DialogTitle>
                <DialogDescription>
                  Uploaded on {new Date(selectedFile.uploadedAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>

              <div className="mt-4">
                {selectedFile.fileType === "image" ? (
                  <div className="overflow-hidden rounded-lg">
                    <img
                      src={selectedFile.url || "/placeholder.svg"}
                      alt={selectedFile.fileName}
                      className="w-full object-contain"
                    />
                  </div>
                ) : selectedFile.fileType === "video" ? (
                  <video src={selectedFile.url} controls className="w-full rounded-lg" />
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center rounded-lg bg-muted">
                    {getFileIcon(selectedFile.fileType)}
                    <span className="mt-2 text-lg font-bold">{getFileExtension(selectedFile.fileName)}</span>
                    <span className="mt-1 text-sm text-muted-foreground">
                      Preview not available. Click download to view this file.
                    </span>
                  </div>
                )}
              </div>

              {selectedFile.description && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedFile.description}</p>
                </div>
              )}

              {selectedFile.tags.length > 0 && (
                <div className="mt-4">
                  <h4 className="mb-1 text-sm font-medium">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedFile.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline" asChild>
                  <a href={selectedFile.url} download={selectedFile.fileName} target="_blank" rel="noopener noreferrer">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </a>
                </Button>
                <Button variant="destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
