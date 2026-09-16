import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Eye, Edit2, Trash2 } from 'lucide-react'

export interface PatientData {
  id: number
  name: string
  age: number
  diagnosis: string
  joinDate: string
  latestScore: number
  status: 'active' | 'inactive'
}

interface PatientListProps {
  patients: PatientData[]
  onView?: (patient: PatientData) => void
  onEdit?: (patient: PatientData) => void
  onDelete?: (patientId: number) => void
}

export default function PatientList({ patients, onView, onEdit, onDelete }: PatientListProps) {
  console.log('[PatientList] onDelete received:', typeof onDelete)
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Age</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Diagnosis</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Joined</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Score</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {patients.map((patient) => (
                <tr key={patient.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-foreground text-lg">{patient.name}</td>
                  <td className="px-6 py-4 text-foreground text-lg">{patient.age}</td>
                  <td className="px-6 py-4 text-muted-foreground text-lg">{patient.diagnosis}</td>
                  <td className="px-6 py-4 text-muted-foreground text-lg">{patient.joinDate}</td>
                  <td className="px-6 py-4">
                    <span className="font-bold text-primary text-lg">{patient.latestScore}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${patient.status === 'active'
                        ? 'bg-accent/20 text-accent'
                        : 'bg-muted text-muted-foreground'
                      }`}>
                      {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {onView && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onView(patient)}
                          className="px-3"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      {onEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onEdit(patient)}
                          className="px-3"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            const numId = Number(patient.id)
                            console.log('[PatientList] Trash clicked | patient.id:', patient.id, '| typeof:', typeof patient.id, '| numId:', numId, '| onDelete:', typeof onDelete)
                            onDelete(numId)
                          }}
                          className="px-3 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
