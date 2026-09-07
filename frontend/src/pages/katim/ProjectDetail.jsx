import ProjectDetailView from '../../components/ProjectDetailView'

export default function ProjectDetail() {
  return <ProjectDetailView basePath="/katim/projects" canAddSubtask={true} canApproveProject={false} />
}
