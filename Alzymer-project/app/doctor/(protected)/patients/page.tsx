'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PatientList, { PatientData } from '@/components/doctor/patient-list'
import AddPatientModal from '@/components/doctor/add-patient-modal'
import { Plus } from 'lucide-react'
import { api } from '@/lib/api'
import { toast } from 'sonner'

export default function PatientsPage() {
  const router = useRouter()
  const [patients, setPatients] = useState<PatientData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newCredentials, setNewCredentials] = useState<{name: string, email: string, password: string} | null>(null)

  // Load patients from backend on mount
  useEffect(() => {
    const loadPatients = async () => {
      try {
        const doctorId = localStorage.getItem('doctor_id')
        if (!doctorId) return
        const data: any = await api.getDoctorPatients(doctorId)
        const raw = data?.patients || []
        const mapped: PatientData[] = raw.map((p: any) => ({
          id: p.id,
          name: p.name,
          age: p.age || 0,
          diagnosis: p.diagnosis || 'Not specified',
          joinDate: p.createdAt
            ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : 'N/A',
          latestScore: p.latestScore || 0,
          status: (p.status === 'active' || p.status === 'inactive') ? p.status : 'active',
        }))
        setPatients(mapped)
      } catch (err: any) {
        toast.error('Failed to load patients: ' + (err.message || 'Unknown error'))
      } finally {
        setIsLoading(false)
      }
    }
    loadPatients()
  }, [])

  const handleDelete = async (id: number) => {
    console.log('[PatientsPage] handleDelete called with id:', id, '| typeof id:', typeof id)
    // Optimistic update — remove from UI immediately
    const previous = patients
    setPatients(prev => prev.filter(p => Number(p.id) !== Number(id)))

    try {
      await api.deletePatient(id)
      toast.success('Patient removed successfully')
      console.log('[PatientsPage] Backend delete succeeded for id:', id)
    } catch (err: any) {
      // Rollback on failure
      console.error('[PatientsPage] Backend delete failed, rolling back:', err)
      setPatients(previous)
      toast.error('Failed to delete patient: ' + (err.message || 'Unknown error'))
    }
  }
  console.log('[PatientsPage] handleDelete defined:', typeof handleDelete)

  const handleSavePatient = async (data: { name: string; age: string; diagnosis: string; email: string }) => {
    try {
      if (!data.name || !data.age) {
        toast.error('Please fill in required fields (Name and Age)')
        const err = new Error('Please fill in Name and Age')
        throw err
      }

      const doctorId = localStorage.getItem('doctor_id')
      if (!doctorId) {
        toast.error('Doctor session not found. Please log in again.')
        const err = new Error('Doctor session not found')
        throw err
      }

      const result: any = await api.createNewPatient({
        doctorId,
        name: data.name,
        age: parseInt(data.age) || 0,
        diagnosis: data.diagnosis || 'Not specified',
        email: data.email || `patient_${Date.now()}@email.com`,
      })

      const newPatient: PatientData = {
        id: result?.patientId || Date.now(),
        name: result?.patientName || data.name,
        age: parseInt(data.age) || 0,
        diagnosis: data.diagnosis || 'Not specified',
        joinDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        latestScore: 0,
        status: 'active',
      }

      setNewCredentials({
        name: result?.patientName || data.name,
        email: result?.email || data.email || `patient_${Date.now()}@email.com`,
        password: result?.generatedPassword || 'temp-password-123',
      })

      setPatients(prev => [newPatient, ...prev])
      toast.success('Patient created successfully!')
    } catch (error: any) {
      console.error('[PatientsPage] Error saving patient:', error)
      
      let message = error.message || 'Failed to create patient'
      
      // Specifically handle duplicate email case if backend message mentions it
      if (message.toLowerCase().includes('already exists') || message.toLowerCase().includes('duplicate')) {
        message = 'Patient with this email already exists'
      }
      
      // Re-throw with formatted message so modal can catch it
      const enhancedError = new Error(message)
      throw enhancedError
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <h1 className="text-4xl font-bold text-foreground">My Patients</h1>
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-muted rounded-lg w-48" />
          <div className="h-64 bg-muted rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-foreground">My Patients</h1>
          <p className="text-lg text-muted-foreground">Manage and monitor your patients' progress</p>
        </div>
        <Button
          size="lg"
          className="flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus className="w-5 h-5" />
          Add Patient
        </Button>
      </div>

      {newCredentials && (
        <Card className="border-green-500 bg-green-500/10 mb-8">
          <CardHeader>
            <CardTitle className="text-green-700 dark:text-green-400">Patient Account Created</CardTitle>
            <CardDescription className="text-green-600 dark:text-green-300">
              Please share these credentials with the patient. They will only be shown once.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 font-mono bg-background p-4 rounded-md border text-foreground">
              <p><strong>Name:</strong> {newCredentials.name}</p>
              <p><strong>Login ID/Email:</strong> {newCredentials.email}</p>
              <p><strong>Password:</strong> {newCredentials.password}</p>
            </div>
            <Button className="mt-4 w-full" variant="outline" onClick={() => setNewCredentials(null)}>
              I have copied the credentials
            </Button>
          </CardContent>
        </Card>
      )}

      <AddPatientModal
        open={showModal}
        onOpenChange={setShowModal}
        onSave={handleSavePatient}
      />

      <PatientList 
        patients={patients}
        onView={(patient) => router.push(`/doctor/patients/${patient.id}`)}
        onDelete={handleDelete}
      />

    </div>
  )
}
