---
title: "工具性能"
description: "从 Python 的 Agent Development Kit（Agent Development Kit, ADK）版本 1.10.0 开始，该框架尝试并行运行任何 Agent 请求的功能工具。这种行为可以显著提高性能和响应速度"
icon: "article"
weight: 20
toc: true
---

支持版本：Python v1.10.0。

从 Python 的 Agent Development Kit (ADK) 版本 1.10.0 开始，框架会尝试并行运行任何 Agent 请求的 [function tools](/docs/adk/components/custom-tools/function-tools/overview/)。这种行为可以显著提高 Agent 的性能和响应速度，尤其是对于依赖多个外部 API 或长时间运行任务的 Agent。例如，如果你有 3 个工具，每个工具需要 2 秒，通过并行运行，它们的总执行时间将接近 2 秒，而不是 6 秒。运行工具函数的并行能力可以提升 Agent 的性能，特别是在以下场景中：

- **研究任务：** Agent 在进入工作流下一阶段之前需要收集多个信息来源的信息。
- **API 调用：** Agent 独立访问几个 API，例如通过多个航空公司的 API 搜索可用航班。
- **发布与通信任务：** 当 Agent 需要通过多个独立渠道或传达给多个接收者进行发布或通信时。

然而，你的自定义工具必须支持异步执行才能实现此性能提升。本指南将解释 ADK 中并行工具执行的工作原理，并说明如何构建工具以充分利用这一处理功能。

{{% alert context="warning" %}}
任何在一组工具函数调用中使用同步处理的 ADK 工具，将会阻止其他工具并行执行，即使其他工具支持并行执行。
{{% /alert %}}
## 构建支持并行的工具 {#build-parallel-ready-tools}

通过将工具函数定义为异步函数来启用工具函数的并行执行。在 Python 代码中，这意味着使用 `async def` 和 `await` 语法，允许 ADK 在 `asyncio` 事件循环中并发运行它们。以下各节展示了为并行处理和异步操作构建的 Agent 工具示例。

### HTTP 网络调用示例 {#example-of-http-web-call}

以下代码示例展示了如何修改 `get_weather()` 函数，使其异步运行并允许并行执行：

```python
async def get_weather(city: str) -> dict:
     async with aiohttp.ClientSession() as session:
         async with session.get(f"http://api.weather.com/{city}") as response:
             return await response.json()
```

### 数据库调用示例 {#example-of-database-call}

以下代码示例展示了如何编写一个异步操作的数据库调用函数：

```python
async def query_database(query: str) -> list:
      async with asyncpg.connect("postgresql://...") as conn:
          return await conn.fetch(query)
```

### 长循环的让步行为示例 {#example-of-yielding-behavior-for-long-loops}

在工具处理多个请求或大量长时间运行的请求的情况下，考虑添加让步代码以允许其他工具执行，如以下代码示例所示：

```python
async def process_data(data: list) -> dict:
      results = []
      for i, item in enumerate(data):
          processed = await process_item(item)  # Yield point
          results.append(processed)

          # 为长循环添加周期性产量点
          if i % 100 == 0:
              await asyncio.sleep(0)  # Yield control
      return {"results": results}
```

{{% alert context="success" %}}
**重要**

对于暂停操作，请使用 `asyncio.sleep()` 函数以避免阻塞其他函数的执行。
{{% /alert %}}
### 密集操作的线程池示例 {#example-of-thread-pools-for-intensive-operations}

在执行处理密集型函数时，可以考虑创建线程池以更好地管理可用的计算资源，如以下示例所示：

```python
async def cpu_intensive_tool(data: list) -> dict:
      loop = asyncio.get_event_loop()

      # 对 CPU 密集型工作使用线程池
      with ThreadPoolExecutor() as executor:
          result = await loop.run_in_executor(
              executor,
              expensive_computation,
              data
          )
      return {"result": result}
```

### 处理分块示例 {#example-of-process-chunking}

在对长列表或大量数据进行处理时，可以考虑将线程池技术与将处理分成数据块的方法结合起来，并在处理块之间让出处理时间，如下例所示：

```python
async def process_large_dataset(dataset: list) -> dict:
     results = []
     chunk_size = 1000

     for i in range(0, len(dataset), chunk_size):
         chunk = dataset[i:i + chunk_size]

         # 在线程池中处理块
         loop = asyncio.get_event_loop()
         with ThreadPoolExecutor() as executor:
             chunk_result = await loop.run_in_executor(
                 executor, process_chunk, chunk
             )

         results.extend(chunk_result)

         # 在块之间让出控制
         await asyncio.sleep(0)

     return {"total_processed": len(results), "results": results}
```

## 编写支持并行的提示和工具描述 {#write-parallel-ready-prompts-and-tool-descriptions}

在为 AI 模型构建提示时，考虑明确指定或暗示
应以并行方式进行函数调用。以下是一个 AI 提示的示例，
指导模型以并行方式使用工具：

```none
When users ask for multiple pieces of information, always call functions in
parallel.

  Examples:
  - "Get weather for London and currency rate USD to EUR" → Call both functions
    simultaneously
  - "Compare cities A and B" → Call get_weather, get_population, get_distance in
    parallel
  - "Analyze multiple stocks" → Call get_stock_price for each stock in parallel

  Always prefer multiple specific function calls over single complex calls.
```

以下示例展示了一个工具功能描述，该描述暗示通过并行执行可以更高效地使用：

```python
async def get_weather(city: str) -> dict:
     """Get current weather for a single city.

     This function is optimized for parallel execution - call multiple times for different cities.

     Args:
         city: Name of the city, for example: 'London', 'New York'

     Returns:
         Weather data including temperature, conditions, humidity
     """
     await asyncio.sleep(2)  # Simulate API call
     return {"city": city, "temp": 72, "condition": "sunny"}
```

## 下一步 {#next-steps}

有关为 Agent 和函数调用构建工具的更多信息，请参阅[Function Tools](/docs/adk/components/custom-tools/function-tools/overview/)。有关利用并行处理的工具的更详细示例，请参阅[adk-python](https://github.com/google/adk-python/tree/main/contributing/samples/tools/parallel_functions)存储库中的示例。

---

原文：[Increase tool performance with parallel execution](https://adk.dev/tools-custom/performance/) · [固定源版本](https://github.com/google/adk-docs/blob/e0bf69f506a609baf0b684f99eb2bacb179e7507/docs/tools-custom/performance.md)
