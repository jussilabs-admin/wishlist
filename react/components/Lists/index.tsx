import React, { Component, Fragment, ReactNode } from 'react'

import { append, filter, map, update } from 'ramda'
import { compose, withApollo, WithApolloClient } from 'react-apollo'
import { createPortal } from 'react-dom'
import { FormattedMessage, InjectedIntlProps, injectIntl, defineMessages } from 'react-intl'

import { withRuntimeContext } from 'vtex.render-runtime'
import { deleteList, getListsFromLocaleStorage } from '../../GraphqlClient'

import CreateList from '../Form/CreateList'
import UpdateList from '../Form/UpdateList'
import Header from '../Header'
import ListDetails from '../ListDetails/index'
import ListItem from '../ListItem'
import renderLoading from '../Loading'
import Screen from '../Screen'

import styles from '../../wishList.css'

const DEFAULT_LIST_INDEX = 0
const OPEN_LISTS_CLASS = styles.open
const messages = defineMessages({
  myLists: {
    defaultMessage: '',
    id: 'wishlist-my-lists',
  },
  noListCreated: {
    defaultMessage: '',
    id: 'wishlist-no-list-created',
  },
})

interface ListsState {
  listSelected: number
  lists: List[]
  loading: boolean
  show: boolean
  showCreateList?: boolean
  showUpdateList?: boolean
  showListDetails?: boolean
}

interface ListsProps extends InjectedIntlProps, WithApolloClient<{}> {
  onClose: () => void
}

class Lists extends Component<ListsProps, ListsState> {
  public state: ListsState = {
    listSelected: -1,
    lists: [],
    loading: true,
    show: true,
  }

  private isComponentMounted: boolean = false

  public componentWillUnmount() {
    this.isComponentMounted = false
    document.body.classList.remove(OPEN_LISTS_CLASS)
  }

  public componentDidMount(): void {
    const { client } = this.props
    this.isComponentMounted = true
    document.body.classList.add(OPEN_LISTS_CLASS)
    getListsFromLocaleStorage(client)
      .then(response => {
        const lists = map(item => item.data.list, response)
        if (this.isComponentMounted) {
          this.setState({ loading: false, lists })
        }
      })
      .catch(() => this.isComponentMounted && this.setState({ loading: false }))
  }

  public render = (): ReactNode => {
    const {
      show,
      showCreateList,
      showUpdateList,
      showListDetails,
      listSelected,
      lists,
    } = this.state
    const { onClose, intl } = this.props

    return !show
      ? null
      : createPortal(
          <Screen>
            <Header
              title={intl.formatMessage(messages.myLists)}
              onClose={onClose}
              action={() => this.setState({ showCreateList: true })}
            />
            {this.renderContent()}
            {showCreateList && (
              <div className="fixed vw-100 top-0 bg-base">
                <CreateList
                  onClose={() => this.setState({ showCreateList: false })}
                  onFinishAdding={this.handleListCreated}
                />
              </div>
            )}
            {showUpdateList && (
              <Screen>
                <UpdateList
                  onClose={() => this.setState({ showUpdateList: false })}
                  list={lists[listSelected]}
                  onFinishUpdate={this.handleListUpdated}
                />
              </Screen>
            )}
            {showListDetails && (
              <div className="fixed vw-100 top-0 left-0 bg-base">
                <ListDetails
                  onClose={() => this.setState({ showListDetails: false })}
                  listId={lists[listSelected].id}
                  onDeleted={this.handleDeleteList}
                />
              </div>
            )}
          </Screen>,
          document.body
        )
  }

  private renderLists = (): ReactNode => {
    const { lists } = this.state
    return (
      <Fragment>
        {lists.length ? (
          <div className="bb b--muted-4 h-100 overflow-auto">
            {lists.map((list, key) => (
              <ListItem
                key={key}
                list={list}
                id={key}
                isDefault={key === DEFAULT_LIST_INDEX}
                onClick={() =>
                  this.setState({ showListDetails: true, listSelected: key })
                }
                showMenuOptions
                onDeleted={this.handleDeleteList}
                onUpdated={this.handleUpdateList}
              />
            ))}
          </div>
        ) : (
          <div className="tc pv4 c-muted-2">
            <FormattedMessage {...messages.noListCreated} />
          </div>
        )}
      </Fragment>
    )
  }

  private handleDeleteList = (listId: string): Promise<void> => {
    const { lists } = this.state
    const { client } = this.props
    return deleteList(client, listId)
      .then(() => {
        if (this.isComponentMounted) {
          this.setState({
            lists: filter(list => list.id !== listId, lists),
            showListDetails: false,
          })
        }
      })
      .catch(error => console.error(error))
  }

  private handleUpdateList = (index: number): void => {
    this.setState({ listSelected: index, showUpdateList: true })
  }

  private handleListCreated = (list: List): void => {
    const { lists } = this.state
    this.setState({ showCreateList: false, lists: append(list, lists) })
  }

  private handleListUpdated = (list: List): void => {
    const { lists, listSelected } = this.state
    this.setState({
      lists: update(listSelected, list, lists),
      showUpdateList: false,
    })
  }

  private renderContent = (): ReactNode => {
    const { loading } = this.state
    return loading ? renderLoading() : this.renderLists()
  }
}

export default compose(
  injectIntl,
  withRuntimeContext,
  withApollo
)(Lists)
