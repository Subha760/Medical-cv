import { Component, ErrorInfo, ReactNode } from 'react';
export default class ErrorBoundary extends Component<{children:ReactNode},{error:boolean}> {
  state={error:false};
  static getDerivedStateFromError(){return {error:true};}
  componentDidCatch(_error:Error,_info:ErrorInfo){ /* Do not log personal CV contents. */ }
  render(){return this.state.error?<main className="container" style={{padding:32}}><h1>Your saved work needs attention</h1><p>Nothing has been deleted. Open Settings to download a backup or recover the previous revision.</p><a className="btn btn-primary" href="#/settings" onClick={e=>{e.preventDefault();window.location.hash="/settings";window.location.reload();}}>Open recovery settings</a></main>:this.props.children;}
}
