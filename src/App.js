import "./App.css";
import React, { useState, useEffect } from "react";
import { createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";
import { Provider, connect } from "react-redux";
import {
  Router,
  Route,
  Link,
  Redirect,
  Switch,
  useHistory,
} from "react-router-dom";
import { createBrowserHistory } from "history";

function promiseReducer(state, { type, status, name, payload, error }) {
  if (state === undefined) {
    return {};
  }
  if (type === "PROMISE") {
    return {
      ...state,
      [name]: { status, payload, error },
    };
  }
  return state;
}
localStorage.authToken =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOnsiaWQiOiI2MmM4NzA4OGI3NGUxZjVmMmVjMWEwYzMiLCJsb2dpbiI6InRlc3QxMjMiLCJhY2wiOlsiNjJjODcwODhiNzRlMWY1ZjJlYzFhMGMzIiwidXNlciJdfSwiaWF0IjoxNjU4MzM4MjgzfQ.1fAQVvJgrWlUHl5d__wEEHlmD1yTSbzX7G2biIRGohg"
let getGQL = (url) => {
  return (query, variables = {}) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: "Bearer " + localStorage.authToken,
      },
      body: JSON.stringify({ query, variables }),
    }).then(
      (res) => res.json(),
      function (consumption) {
        console.error("Error!", consumption.message);
      }
    );
};

let gql = getGQL("http://shop-roles.node.ed.asmer.org.ua/graphql");

const store = createStore(promiseReducer, applyMiddleware(thunk));
store.subscribe(() => console.log(store.getState()));

const actionPending = (name) => ({ type: "PROMISE", status: "PENDING", name });
const actionFulfilled = (name, payload) => ({
  type: "PROMISE",
  status: "FULFILLED",
  name,
  payload,
});
const actionRejected = (name, error) => ({
  type: "PROMISE",
  status: "REJECTED",
  name,
  error,
});

const actionPromise = (name, promise) => async (dispatch) => {
  dispatch(actionPending(name));
  try {
    let payload = await promise;
    dispatch(actionFulfilled(name, payload));
    return Object.values(payload.data);
  } catch (err) {
    dispatch(actionRejected(name, err));
  }
};

const actionAllCategories = () => {
  const queryPromise = gql(
    `
                                    query Cats{
                                        CategoryFind(query:"[{}]"){
                                                _id
                                            name    
                                        }
                            }`,
    {}
  );
  return actionPromise("allCategories", queryPromise);
};

const actionCategoryById = (_id) => {
  const queryPromise = gql(
    `
        query catById($query:String){
            CategoryFindOne(query:$query){
            _id name 
                goods{
            _id name price images{
                url
            }
            }
        }
        }`,
    { query: JSON.stringify([{ _id }]) }
  );

  return actionPromise("categoryById", queryPromise);
};

const actionGoodById = (_id) => {
  const queryPromise = gql(
    `
    query catById($query:String){
        GoodFindOne(query:$query){
        _id, name, images{url}, description, price, 
        }
        }`,
    { query: JSON.stringify([{ _id }]) }
  );

  return actionPromise("goodById", queryPromise);
};

const actionMyOrders = () => {
  const queryPromise = gql(
    `
    query MyOrder{
      OrderGoodFind(query: "[{}]"){
        _id
        owner{
          nick
        }
        good{
          name, images{url}, _id, price, description
        }
      }
    }`,
    {}
  );

  return actionPromise("myOrders", queryPromise);
};

store.dispatch(actionAllCategories());

const history = createBrowserHistory();

console.log(history);

const LeftMenuCategory = ({ category: { _id, name } }) => (
  <li className="items-list__item">
    <Link className="Category" to={`/category/${_id}`}>
      {name}
    </Link>
  </li>
);

const LeftMenu = ({ categories = [], status }) =>
  status === "PENDING" || !status ? (
    <>LOADING</>
  ) : (
    <aside className="LeftMenu">
      <ul className="LeftMenu__items-list">
        {categories.map((category) => (
          <LeftMenuCategory category={category} key={category._id} />
        ))}
      </ul>
    </aside>
  );

const CLeftMenu = connect((state) => ({
  categories: state.allCategories?.payload?.data?.CategoryFind,
  status: state.allCategories?.status,
}))(LeftMenu);

const Card = ({ good: { name, images, _id, price, description } }) => (
  <Link to={`/good/${_id}`} className="Card">
    {name ? <h2>{name}</h2> : ""}
    {images ? (
      <img
        className="GoodImg"
        src={`http://shop-roles.node.ed.asmer.org.ua/${
          images && images[0] && images[0].url
        }`}
      />
    ) : (
      ""
    )}
    {price ? <span className="Price">{price}</span> : ""}
    {description ? <p>{description}</p> : ""}
  </Link>
);

const PageCategory = ({
  match: {
    params: { _id },
  },
  onIdChange,
  category,
}) => {
  useEffect(() => {
    onIdChange(_id);
  }, [_id]);
  return category ? (
    <div>
      <h1>{category.name}</h1>
      <div className="PageCategory">
        {!!category.goods?.length ? (
          category.goods.map((good) => (
            <Card className="Card" key={good._id} good={good} />
          ))
        ) : (
          <>No goods in this category</>
        )}
      </div>
    </div>
  ) : (
    <>Loading</>
  );
};
const PageGood = ({
  match: {
    params: { _id },
  },
  onIdChange,
  good,
}) => {
  useEffect(() => {
    onIdChange(_id);
  }, [_id]);
  return good ? (
    <div className="PageGood">
      <Card good={good} />
    </div>
  ) : (
    <>Loading</>
  );
};
const PageOrders = ({ onIdChange, orders }) => {
  useEffect(() => {
    onIdChange();
  }, []);
  console.log("====>", orders);
  return orders ? (
    <div className="PageGood">
      {!!orders.length ? (
        orders.map((order) =>
          order.good === null ? (
            ""
          ) : (
            <Card key={order._id} good={order.good} />
          )
        )
      ) : (
        <>No goods in this category</>
      )}
    </div>
  ) : (
    <>Loading</>
  );
};

const CPageCategory = connect(
  (state) => ({ category: state.categoryById?.payload?.data?.CategoryFindOne }),
  { onIdChange: actionCategoryById }
)(PageCategory);
const CPageGood = connect(
  (state) => ({ good: state.goodById?.payload?.data?.GoodFindOne }),
  { onIdChange: actionGoodById }
)(PageGood);
const CPageOrders = connect(
  (state) => ({ orders: state.myOrders?.payload?.data?.OrderGoodFind }),
  { onIdChange: actionMyOrders }
)(PageOrders);

const App = () => (
  <div className="Wrapper">
    <Router history={history}>
      <Provider store={store}>
        <CLeftMenu />
        <div className="Content">
          <Route path="/category/:_id" component={CPageCategory} />
          <Route path="/good/:_id" component={CPageGood} />
          <Route path="/orders" component={CPageOrders} />
        </div>
      </Provider>
    </Router>
  </div>
);

export default App;
