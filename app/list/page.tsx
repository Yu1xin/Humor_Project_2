import { supabase } from '@/lib/supabaseClient'

export default async function ListPage() {
  const { data, error } = await supabase.from('your_table_name').select('*')

  if (error) {
    return <div className="p-4 text-red-500">Error fetching data: {error.message}</div>
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white p-8">
      <h1 className="text-2xl font-bold mb-4">Data from Supabase</h1>
      <ul className="space-y-2">
        {data.map((item: any, idx: number) => (
          <li key={idx} className="border border-gray-300 dark:border-zinc-700 p-4 rounded">
            <pre className="text-sm">{JSON.stringify(item, null, 2)}</pre>
          </li>
        ))}
      </ul>
    </div>
  )
}
