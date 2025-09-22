'use client'
import Link from 'next/link'
import { useSubgraph } from '@/hooks/useSubgraph'
import { GET_GROUPS } from '@/lib/queries'
import CreateGroupForm from '@/components/CreateGroupForm'
import ENSName from '@/components/ENSName'

export default function HomePage() {
  const { data, loading, refetch } = useSubgraph<{ groups: any[] }>(GET_GROUPS, [])
  if (loading) return <div>Loading...</div>

  // Debug: Log the data to see what we're getting
  console.log('Groups data:', data?.groups)

  // Show all groups from subgraph
  const groups = data?.groups || []
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-xl font-semibold">Groups</div>
        <CreateGroupForm onGroupCreated={refetch} />
      </div>


      <div className="grid gap-3">
        {groups.map((g) => (
          <Link href={`/group/${encodeURIComponent(g.name)}`} key={g.id} className="block p-4 border rounded-xl bg-white hover:border-emerald-200 transition-colors">
            <div className="font-medium">{g.name || `Group #${g.id}`}</div>
            <div className="text-sm text-zinc-600 mb-2">
              Members: {g.members.length}
            </div>
            <div className="flex flex-wrap gap-2">
              {g.members.slice(0, 3).map((member: any) => (
                <span key={member.id} className="text-xs">
                  <ENSName address={member.id} />
                </span>
              ))}
              {g.members.length > 3 && (
                <span className="text-xs text-zinc-500">
                  +{g.members.length - 3} more
                </span>
              )}
            </div>
          </Link>
        ))}
        {groups.length === 0 && (
          <div className="text-center py-8 text-zinc-500">
            <div className="text-lg mb-2">Ready for Custom Groups!</div>
            <div className="text-sm">
              Create groups with custom names using the new contract.
              Old groups are hidden to show only your new, properly named groups.
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

