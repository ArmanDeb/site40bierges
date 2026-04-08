import React from "react";
import axios from "axios";
import '../../assets/css/main.css'

class Logs extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      logs: [],
      isLoading: true,
      url: "http://localhost:3001"
    };
  }

  componentDidMount() {
    this.fetchLogs();
  }

  fetchLogs() {
    axios.get(this.state.url + '/logs').then(response => {
      this.setState({ logs: response.data, isLoading: false });
    }).catch(error => {
      console.log(error);
      this.setState({ isLoading: false });
    });
  }

  render() {
    if (this.state.isLoading) return (<p>Chargement des logs...</p>);
    return (
      <>
        <div>
          <h2>Journal d'activité (forensique)</h2>
          {this.state.logs.length === 0 ? (
            <p>Aucun événement enregistré.</p>
          ) : (
            <table border="1" cellPadding="6">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Événement</th>
                  <th>Email</th>
                  <th>Statut</th>
                  <th>Profil utilisateur</th>
                </tr>
              </thead>
              <tbody>
                {this.state.logs.map((log, index) => (
                  <tr key={index}>
                    <td>{log.timestamp}</td>
                    <td>{log.event}</td>
                    <td>{log.mail}</td>
                    <td>{log.status}</td>
                    <td><pre>{JSON.stringify(log.userProfile, null, 2)}</pre></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </>
    );
  }
}

export default Logs;
