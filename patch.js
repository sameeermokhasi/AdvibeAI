const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/Modals.jsx', 'utf8');

if (!code.includes('getInvestors')) {
    code = code.replace("import {\n  intakeCompany,\n  getMatches,\n  draftOutreach,\n  sendOutreach,\n  getCampaigns,\n  ApiError\n} from '../lib/api';", "import {\n  intakeCompany,\n  getMatches,\n  draftOutreach,\n  sendOutreach,\n  getCampaigns,\n  getInvestors,\n  ApiError\n} from '../lib/api';");
}

if (!code.includes('const [investorsDb, setInvestorsDb] = useState([]);')) {
    code = code.replace("// CRM / Campaign State", "// Investors DB State\n  const [investorsDb, setInvestorsDb] = useState([]);\n  const [investorsDbLoading, setInvestorsDbLoading] = useState(false);\n\n  // CRM / Campaign State");
}

if (!code.includes('loadInvestorsDb')) {
    const effectStr = `
  useEffect(() => {
    if (activeModal === 'investorsDatabase') {
      loadInvestorsDb();
    }
  }, [activeModal]);

  const loadInvestorsDb = async () => {
    setInvestorsDbLoading(true);
    try {
      const data = await getInvestors();
      setInvestorsDb(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setInvestorsDbLoading(false);
    }
  };
`;
    code = code.replace("  // Load matches when opening matches modal if company exists", effectStr + "\n  // Load matches when opening matches modal if company exists");
}

const modalHtml = `
      {/* 8. Investors Database Modal */}
      <div
        className={\`modal-overlay \${activeModal === 'investorsDatabase' ? 'active' : ''}\`}
        onClick={(e) => e.target === e.currentTarget && closeModal()}
      >
        <div className="modal-card" style={{ maxWidth: '900px' }}>
          <button className="modal-close" onClick={closeModal} aria-label="Close">
            &times;
          </button>
          <span className="badge" style={{ marginBottom: '12px' }}>Investor Database</span>
          <h2 style={{ fontSize: '22px', fontWeight: 600, marginBottom: '6px' }}>Look at the investors whom you can reach out to</h2>
          <p style={{ color: '#9a9a9a', fontSize: '13.5px', marginBottom: '20px' }}>
            Browse verified investors and decision makers from our network.
          </p>

          {investorsDbLoading ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#9a9a9a' }}>
              Loading investors...
            </div>
          ) : (
            <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <th style={{ padding: '12px 8px', color: '#9a9a9a', fontWeight: 500 }}>Name</th>
                    <th style={{ padding: '12px 8px', color: '#9a9a9a', fontWeight: 500 }}>Kind of Investor</th>
                    <th style={{ padding: '12px 8px', color: '#9a9a9a', fontWeight: 500 }}>LinkedIn</th>
                    <th style={{ padding: '12px 8px', color: '#9a9a9a', fontWeight: 500 }}>Email ID</th>
                  </tr>
                </thead>
                <tbody>
                  {investorsDb.flatMap(inv => 
                    inv.people.map(person => (
                      <tr key={person.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '12px 8px', color: '#fff' }}>{person.full_name}</td>
                        <td style={{ padding: '12px 8px', color: '#fff' }}>
                          <div style={{ fontWeight: 500 }}>{inv.firm_name}</div>
                          <div style={{ fontSize: '12px', color: '#9a9a9a' }}>{inv.fund_type}</div>
                        </td>
                        <td style={{ padding: '12px 8px' }}>
                          {person.linkedin_url ? (
                            <a href={person.linkedin_url} target="_blank" rel="noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>Profile</a>
                          ) : 'N/A'}
                        </td>
                        <td style={{ padding: '12px 8px', color: '#9a9a9a' }}>{person.email}</td>
                      </tr>
                    ))
                  )}
                  {investorsDb.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#9a9a9a' }}>No investors found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
`;
if (!code.includes('Investors Database Modal')) {
    code = code.replace("    </>\n  );\n}\n", modalHtml + "    </>\n  );\n}\n");
}

fs.writeFileSync('frontend/src/components/Modals.jsx', code);
