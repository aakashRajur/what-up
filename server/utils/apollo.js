const {ApolloServer, gql} = require('apollo-server-express');
const cookie = require('cookie');
const jwt = require('jsonwebtoken');
const getPublisher = require('./publisher');
const publisher = getPublisher();
const {
	TASKS_CHANGED,
	TASK_CANCELLED,
	SESSION_CHANGE,
	verifySession,
	getStats
} = require('./library');

const typeDefs = gql`
    enum TASK_STATUS {
        CREATED,
        COMPLETED,
        CANCELLED
    }

    type Task {
        id: String!,
        description: String!,
        status: TASK_STATUS
        created: String!,
        updated: String!
    }

    type Event {
        timestamp: String!,
        CREATED: Int,
        COMPLETED: Int,
        CANCELLED: Int,
        ALL: Int,
        additional: String
    }

    type Query {
        hello(name: String): String!,
        tasks(filter: String, timestamp: String): [Task]
    }

    type Mutation {
        hello(name: String): String!,
        add(description: String!): String!,
        remove(id: String!): String!,
        edit(id: String!, description: String!): String!
        update(id: String!, status: String!): String!,
        updateAll(filter:String!, status: String!): Int
    }

    type Subscription {
        TASKS_CHANGED: Event!,
        SESSION_CHANGE: Event!
    }
`;

function hasSessionExpired(context) {
	if (!context.user) {
		publisher.notify(SESSION_CHANGE, {
			additional: JSON.stringify({
				message: 'Session Expired. Please Refresh!'
			})
		});
		return true;
	}
	return false;
}

function resolverGenerator(DB, postgres) {
	return {
		Query: {
			hello: (root, {name}) => {
				return `hello ${name || 'world'}`;
			},
			tasks: async (root, {filter, timestamp}, context) => {
				if (hasSessionExpired(context)) return [];
				return postgres.getTasks(context.user, filter);
			}
		},
		Mutation: {
			hello: (root, {name}) => `not hello ${name || 'world'}`,
			add: async (root, {description}, context) => {
				if (hasSessionExpired(context)) return 'UNAUTHORIZED';
				let result = await postgres.addTask(context.user, description);
				publisher.notify(TASKS_CHANGED, await getStats(context.user));
				return result;
			},
			remove: async (root, {id}, context) => {
				if (hasSessionExpired(context)) return 'UNAUTHORIZED';
				let result = await postgres.updateTask(id, TASK_CANCELLED);
				publisher.notify(TASKS_CHANGED, await getStats(context.user));
				return result;
			},
			edit: async (root, {id, description}, context) => {
				if (hasSessionExpired(context)) return 'UNAUTHORIZED';
				let result = await postgres.editTask(id, description);
				publisher.notify(TASKS_CHANGED, await getStats(context.user));
				return result;
			},
			update: async (root, {id, status}, context) => {
				if (hasSessionExpired(context)) return 'UNAUTHORIZED';
				let result = await postgres.updateTask(id, status);
				publisher.notify(TASKS_CHANGED, await getStats(context.user));
				return result;
			},
			updateAll: async (root, {filter, status}, context) => {
				if (hasSessionExpired(context)) return 'UNAUTHORIZED';
				let result = await postgres.updateAllTasks(context.user, filter, status);
				publisher.notify(TASKS_CHANGED, await getStats(context.user));
				return result;
			}
		},
		Subscription: {
			[TASKS_CHANGED]: {
				subscribe: () => publisher.asyncIterator([TASKS_CHANGED])
			},
			[SESSION_CHANGE]: {
				subscribe: () => publisher.asyncIterator([SESSION_CHANGE])
			}
		}
	}
}

function getApolloServer(DB = {}, postgres)

¢
{
	return new ApolloServer({
		cors: false,
		typeDefs,
		resolvers: resolverGenerator(DB, postgres),
		subscriptions: {
			onConnect: async (connectionParams, webSocket) => {
				let {remoteAddress, remotePort} = webSocket._socket;
				console.log(`websocket connected to ${remoteAddress}:${remotePort}`);
				let {session} = cookie.parse(webSocket.upgradeReq.headers.cookie),
					user = null;
				try {
					user = verifySession(session);
					if (user) setImmediate(async () => {
						publisher.notify(TASKS_CHANGED, await getStats(user));
						publisher.notify(SESSION_CHANGE, {
							additional: JSON.stringify({
								message: `Your UserID is ${user}`
							})
						});
					});
				} catch ({name, message}) {
					if (name === 'TokenExpiredError') {
						try {
							user = jwt.decode(session).user;
							console.log(`nuking all data belonging to ${user}`);
							await postgres.deleteTasks(user);
							await postgres.deleteUser(user);
						} catch (e) {
							console.error(e);
						}
					}
				}
			}
		},
		context: ({req}) => ({...req})
	});
}

module.exports = {
	getApolloServer
};
