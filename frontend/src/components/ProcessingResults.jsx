export default function ProcessingResults({ results }) {
  if (!results || results.length === 0) return null

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-lg shadow-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-blue-200">
          <thead className="bg-gradient-to-r from-blue-50 to-yellow-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider"
              >
                Line
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider"
              >
                Extracted Text
              </th>
              <th
                scope="col"
                className="px-6 py-4 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider"
              >
                Confidence
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-blue-100">
            {results.map((result, index) => (
              <tr key={index} className="hover:bg-gradient-to-r hover:from-yellow-50/30 hover:to-blue-50/30 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                  {index + 1}
                </td>
                <td className="px-6 py-4 text-sm text-blue-900">
                  <input
                    type="text"
                    value={result.text}
                    onChange={(e) => {
                      // Handle text edit if needed
                    }}
                    className="w-full bg-transparent border-blue-200 rounded-md shadow-sm 
                      focus:border-blue-500 focus:ring focus:ring-blue-200 focus:ring-opacity-50
                      hover:border-blue-300 transition-colors"
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-yellow-500"
                        style={{ width: `${result.confidence}%` }}
                      />
                    </div>
                    <span className="ml-2 text-sm text-blue-600">
                      {result.confidence}%
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
