import React from 'react'
import { Route } from 'react-router-dom'
import Personal from './personal/Personal'
import LyricsPage from './lyrics/LyricsPage'

const routes = [
  <Route exact path="/personal" render={() => <Personal />} key={'personal'} />,
  <Route
    exact
    path="/lyrics"
    render={() => <LyricsPage />}
    key={'lyrics'}
  />,
]

export default routes
