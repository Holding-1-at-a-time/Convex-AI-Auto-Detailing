"use client"

import type React from "react"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { LoadingSpinner } from "@/components/loading-spinner"
import { Users, UserPlus, Briefcase, Calendar, X, Edit } from "lucide-react"
import Link from "next/link"
import { StaffScheduleView } from "./staff-schedule-view"

interface StaffManagementProps {
  businessId: string
}

export function StaffManagement({ businessId }: StaffManagementProps) {
  const { user } = useUser()
  const { toast } = useToast()
  const [isAddingStaff, setIsAddingStaff] = useState(false)
  const [isEditingStaff, setIsEditingStaff] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "detailer",
    specialties: [] as string[],
    certifications: [] as string[],
    hourlyRate: "",
    notes: "",
  })
  const [specialty, setSpecialty] = useState("")
  const [certification, setCertification] = useState("")

  // Fetch staff members
  const staffMembers = useQuery(api.staff.getAllStaff) || []
  const addStaffMember = useMutation(api.staff.addStaffMember)
  const updateStaffMember = useMutation(api.staff.updateStaffMember)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddSpecialty = () => {
    if (specialty && !formData.specialties.includes(specialty)) {
      setFormData((prev) => ({
        ...prev,
        specialties: [...prev.specialties, specialty],
      }))
      setSpecialty("")
    }
  }

  const handleRemoveSpecialty = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.filter((s) => s !== item),
    }))
  }

  const handleAddCertification = () => {
    if (certification && !formData.certifications.includes(certification)) {
      setFormData((prev) => ({
        ...prev,
        certifications: [...prev.certifications, certification],
      }))
      setCertification("")
    }
  }

  const handleRemoveCertification = (item: string) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c !== item),
    }))
  }

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      role: "detailer",
      specialties: [],
      certifications: [],
      hourlyRate: "",
      notes: "",
    })
    setSpecialty("")
    setCertification("")
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.role) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    try {
      if (isEditingStaff) {
        await updateStaffMember({
          staffId: isEditingStaff,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          role: formData.role,
          specialties: formData.specialties,
          certifications: formData.certifications,
          hourlyRate: formData.hourlyRate ? Number.parseFloat(formData.hourlyRate) : undefined,
          notes: formData.notes || undefined,
        })

        toast({
          title: "Staff Updated",
          description: `${formData.name}'s information has been updated.`,
        })
      } else {
        await addStaffMember({
          userId: user!.id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          role: formData.role,
          specialties: formData.specialties,
          hireDate: new Date().toISOString().split("T")[0],
          certifications: formData.certifications,
          hourlyRate: formData.hourlyRate ? Number.parseFloat(formData.hourlyRate) : undefined,
          notes: formData.notes || undefined,
        })

        toast({
          title: "Staff Added",
          description: `${formData.name} has been added to your team.`,
        })
      }

      resetForm()
      setIsAddingStaff(false)
      setIsEditingStaff(null)
    } catch (error) {
      console.error("Error managing staff:", error)
      toast({
        title: "Operation Failed",
        description: error instanceof Error ? error.message : "Failed to manage staff. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEditStaff = (staffMember: any) => {
    setFormData({
      name: staffMember.name,
      email: staffMember.email,
      phone: staffMember.phone || "",
      role: staffMember.role,
      specialties: staffMember.specialties || [],
      certifications: staffMember.certifications || [],
      hourlyRate: staffMember.hourlyRate ? staffMember.hourlyRate.toString() : "",
      notes: staffMember.notes || "",
    })
    setIsEditingStaff(staffMember._id)
    setIsAddingStaff(true)
  }

  if (staffMembers === undefined) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Staff Management</h2>
          <p className="text-muted-foreground">Manage your team members and their schedules</p>
        </div>
        <Button onClick={() => setIsAddingStaff(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Staff Member
        </Button>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Staff</TabsTrigger>
          <TabsTrigger value="schedule">Staff Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {staffMembers.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Staff Members Yet</h3>
                <p className="text-muted-foreground mb-4">Add your first team member to get started</p>
                <Button onClick={() => setIsAddingStaff(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Staff Member
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {staffMembers.map((staff) => (
                <Card key={staff._id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle>{staff.name}</CardTitle>
                      <Badge variant={staff.status === "active" ? "default" : "secondary"}>{staff.status}</Badge>
                    </div>
                    <CardDescription>{staff.email}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <Briefcase className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">{staff.role}</span>
                      </div>
                      {staff.phone && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Phone:</span> {staff.phone}
                        </div>
                      )}
                      {staff.specialties && staff.specialties.length > 0 && (
                        <div>
                          <span className="text-sm text-muted-foreground">Specialties:</span>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {staff.specialties.map((specialty, index) => (
                              <Badge key={index} variant="outline">
                                {specialty}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {staff.hourlyRate && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Rate:</span> ${staff.hourlyRate}/hr
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/business/staff/${staff._id}/schedule`}>
                        <Calendar className="h-4 w-4 mr-1" />
                        Schedule
                      </Link>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleEditStaff(staff)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="schedule">
          <StaffScheduleView businessId={businessId} />
        </TabsContent>
      </Tabs>

      {/* Add/Edit Staff Dialog */}
      <Dialog open={isAddingStaff} onOpenChange={setIsAddingStaff}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isEditingStaff ? "Edit Staff Member" : "Add New Staff Member"}</DialogTitle>
            <DialogDescription>
              {isEditingStaff ? "Update the details for this staff member" : "Add a new team member to your business"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="John Doe"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="john@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  name="role"
                  value={formData.role}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, role: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detailer">Detailer</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="technician">Technician</SelectItem>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                    <SelectItem value="apprentice">Apprentice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Specialties</Label>
              <div className="flex space-x-2">
                <Input
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g., Ceramic Coating"
                />
                <Button type="button" variant="outline" onClick={handleAddSpecialty}>
                  Add
                </Button>
              </div>
              {formData.specialties.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.specialties.map((item, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {item}
                      <button
                        type="button"
                        onClick={() => handleRemoveSpecialty(item)}
                        className="rounded-full hover:bg-muted p-1"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {item}</span>
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Certifications</Label>
              <div className="flex space-x-2">
                <Input
                  value={certification}
                  onChange={(e) => setCertification(e.target.value)}
                  placeholder="e.g., IDA Certified"
                />
                <Button type="button" variant="outline" onClick={handleAddCertification}>
                  Add
                </Button>
              </div>
              {formData.certifications.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.certifications.map((item, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {item}
                      <button
                        type="button"
                        onClick={() => handleRemoveCertification(item)}
                        className="rounded-full hover:bg-muted p-1"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove {item}</span>
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                <Input
                  id="hourlyRate"
                  name="hourlyRate"
                  type="number"
                  value={formData.hourlyRate}
                  onChange={handleInputChange}
                  placeholder="25.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                placeholder="Additional information about this staff member..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                resetForm()
                setIsAddingStaff(false)
                setIsEditingStaff(null)
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit}>{isEditingStaff ? "Update Staff Member" : "Add Staff Member"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
