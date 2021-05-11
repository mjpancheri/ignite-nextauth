import {useEffect } from 'react';
import Link from 'next/link';

import { api } from '../services/apiClient';
import { withSSRAuth } from '../utils/withSSRAuth';
import { setupAPIClient } from '../services/api';
import { useAuth } from '../hooks/useAuth';
import { Can } from '../components/Can';


export default function Dashboard() {
  const { user, signOut } = useAuth();

  useEffect(() => {
    api.get('/me')
      .then(response => console.log(response?.data))
  }, [])
  
  return (
    <>
      <h1>Dashboard: {user?.email}</h1>

      <button onClick={signOut}>Sign out</button>

      <Can permissions={['metrics.list']}>
        <Link href="/metrics">
          <a href="">Métricas</a>
        </Link>
      </Can>
    </>
  )
}

export const getServerSideProps = withSSRAuth(async (ctx) => {
  const apiClient = setupAPIClient(ctx);
  const response = await apiClient.get('/me');

  // console.log(response.data);

  return {
    props: {}
  }
})