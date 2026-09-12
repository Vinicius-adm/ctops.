import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, Badge, EmptyState, FormInput } from '@/components/Common';
import { Plus, Search, Trash2, Edit2 } from 'lucide-react';

interface Job {
  id: string;
  name: string;
  schedule?: string;
  status: 'active' | 'inactive' | 'paused';
  last_run_at?: string;
  description?: string;
}

export function JobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: '1',
      name: 'Daily Backup',
      schedule: '0 2 * * *',
      status: 'active',
      last_run_at: '2026-01-06 02:00',
      description: 'Backup diário do banco'
    },
    {
      id: '2',
      name: 'Health Check',
      schedule: '*/5 * * * *',
      status: 'active',
      last_run_at: '2026-01-06 15:30',
      description: 'Verificação de saúde de sistemas'
    },
    {
      id: '3',
      name: 'Report Generation',
      schedule: '0 9 * * 1',
      status: 'inactive',
      last_run_at: '2026-01-05 09:00',
      description: 'Geração de relatório semanal'
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'paused'>('all');
  const [showForm, setShowForm] = useState(false);
  const [newJob, setNewJob] = useState({ name: '', schedule: '', description: '' });

  const filteredJobs = jobs.filter((job) => {
    const matchSearch = job.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || job.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const handleAddJob = () => {
    if (newJob.name.trim()) {
      setJobs([
        ...jobs,
        {
          id: Date.now().toString(),
          name: newJob.name,
          schedule: newJob.schedule,
          description: newJob.description,
          status: 'active',
          last_run_at: new Date().toISOString()
        }
      ]);
      setNewJob({ name: '', schedule: '', description: '' });
      setShowForm(false);
    }
  };

  const handleDeleteJob = (id: string) => {
    setJobs(jobs.filter((j) => j.id !== id));
  };

  const getStatusColor = (status: string) => {
    if (status === 'active') return 'success';
    if (status === 'paused') return 'warning';
    return 'error';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Automações</h1>
          <p className="text-gray-600 mt-2">Gerenciamento de jobs e automações</p>
        </div>
        <Button onClick={() => setShowForm(true)} variant="primary" className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Novo Job</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
            <option value="paused">Pausado</option>
          </select>
        </div>
      </Card>

      {/* Add Job Form */}
      {showForm && (
        <Card className="bg-blue-50 border-blue-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Criar novo Job</h2>
          <FormInput
            label="Nome"
            value={newJob.name}
            onChange={(val) => setNewJob({ ...newJob, name: val })}
            placeholder="Ex: Daily Backup"
            required
          />
          <FormInput
            label="Schedule (Cron)"
            value={newJob.schedule}
            onChange={(val) => setNewJob({ ...newJob, schedule: val })}
            placeholder="Ex: 0 2 * * * (todo dia às 2am)"
          />
          <FormInput
            label="Descrição"
            value={newJob.description}
            onChange={(val) => setNewJob({ ...newJob, description: val })}
            placeholder="Descrição do job"
          />
          <div className="flex gap-3">
            <Button onClick={handleAddJob} variant="primary">
              Criar
            </Button>
            <Button onClick={() => setShowForm(false)} variant="secondary">
              Cancelar
            </Button>
          </div>
        </Card>
      )}

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <EmptyState
          title="Nenhum job encontrado"
          description="Crie seu primeiro job para começar a automatizar tarefas"
          icon="⚙️"
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Nome</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Schedule</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Última Execução</th>
                  <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <button
                        onClick={() => navigate(`/jobs/${job.id}`)}
                        className="font-medium text-blue-600 hover:text-blue-800"
                      >
                        {job.name}
                      </button>
                      {job.description && (
                        <p className="text-sm text-gray-500 mt-1">{job.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{job.schedule || '-'}</td>
                    <td className="px-6 py-4">
                      <Badge label={job.status} variant={getStatusColor(job.status) as any} />
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {job.last_run_at ? new Date(job.last_run_at).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/jobs/${job.id}`)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Deletar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
